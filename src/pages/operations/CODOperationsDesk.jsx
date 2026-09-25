import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const money = (value) => `${Number(value || 0).toLocaleString('en-MA', { maximumFractionDigits: 2 })} MAD`;
const digits = (value) => String(value || '').replace(/\D/g, '');
const toWhatsApp = (value, message) => {
  const raw = digits(value);
  const number = raw.startsWith('0') ? `212${raw.slice(1)}` : raw;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
};
const displayAddress = (value) => {
  if (!value) return 'Address not provided';
  if (typeof value === 'object') return Object.values(value).filter(Boolean).join(', ') || 'Address not provided';
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed ? Object.values(parsed).filter(Boolean).join(', ') : String(value);
  } catch {
    return String(value);
  }
};
const stageFor = (item) => {
  if (item.status === 'confirmed') return item.delivery_partner_contacted_at ? 'Pickup requested' : 'Waiting for seller handoff';
  if (item.status === 'shipped' && item.delivery_reported_at) return `Reported: ${item.delivery_report_outcome}`;
  if (item.status === 'shipped') return 'In delivery';
  if (item.status === 'delivered') return 'Delivered — finance follow-up';
  return item.status;
};

const CODOperationsDesk = () => {
  const [fulfillments, setFulfillments] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState('active');
  const [forms, setForms] = useState({});

  const loadQueue = useCallback(async () => {
    try {
      const response = await api.get('/operations/cod-fulfillments');
      setFulfillments(response.data.fulfillments || []);
      setPartner(response.data.deliveryPartner || null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load the COD operations desk.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadQueue(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQueue]);

  const queueCounts = useMemo(() => ({
    active: fulfillments.filter((item) => ['confirmed', 'shipped'].includes(item.status)).length,
    pickup: fulfillments.filter((item) => item.status === 'confirmed' && item.delivery_partner_contacted_at).length,
    delivery: fulfillments.filter((item) => item.status === 'shipped' && !item.delivery_reported_at).length,
    closed: fulfillments.filter((item) => ['delivered', 'refused', 'returned'].includes(item.status)).length,
  }), [fulfillments]);

  const visibleFulfillments = useMemo(() => fulfillments.filter((item) => {
    if (filter === 'pickup') return item.status === 'confirmed' && item.delivery_partner_contacted_at;
    if (filter === 'delivery') return item.status === 'shipped' && !item.delivery_reported_at;
    if (filter === 'closed') return ['delivered', 'refused', 'returned'].includes(item.status);
    return ['confirmed', 'shipped'].includes(item.status);
  }), [filter, fulfillments]);

  const updateForm = (item, field, value) => setForms((current) => ({
    ...current,
    [item.fulfillment_id]: { ...current[item.fulfillment_id], [field]: value },
  }));
  const formFor = (item) => forms[item.fulfillment_id] || {};

  const submit = async (item, action) => {
    const form = formFor(item);
    const isPickup = action === 'pickup';
    const path = isPickup
      ? `/operations/cod-fulfillments/${item.fulfillment_id}/confirm-pickup`
      : `/operations/cod-fulfillments/${item.fulfillment_id}/report-delivery`;
    const payload = isPickup
      ? { carrierName: form.carrierName || '', trackingNumber: form.trackingNumber || '', note: form.pickupNote || '' }
      : { outcome: form.outcome || 'delivered', note: form.deliveryNote || '' };
    setProcessing(`${item.fulfillment_id}:${action}`);
    try {
      await api.post(path, payload);
      toast.success(isPickup ? 'Pickup and tracking recorded.' : 'Delivery outcome reported to rifKANDO finance.');
      await loadQueue();
    } catch (error) {
      toast.error(error.response?.data?.error || 'The COD task could not be updated.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <main className="cod-ops"><div className="cod-ops__empty">Loading COD operations…</div></main>;

  return (
    <main className="cod-ops">
      <header className="cod-ops__header">
        <div>
          <span>Internal team workspace</span>
          <h1>COD Operations Desk</h1>
          <p>Coordinate seller handoffs, carrier tracking, and delivery reports. Cash collection, rifKANDO commission, and seller payouts stay in the finance control.</p>
        </div>
        <button type="button" onClick={() => void loadQueue()}>Refresh queue</button>
      </header>

      <section className="cod-ops__partner" aria-label="Delivery partner">
        <div><strong>{partner?.name || 'Toufiq Zariohi'}</strong><span>COD delivery partner · {partner?.carrierNetwork || 'Najm Chamal and Ghazala'}</span></div>
        <a href={`https://wa.me/${partner?.whatsappNumber || '212601805095'}`} target="_blank" rel="noreferrer">WhatsApp operations</a>
      </section>

      <nav className="cod-ops__filters" aria-label="COD task filters">
        {[
          ['active', 'Active work', queueCounts.active],
          ['pickup', 'Pickup requested', queueCounts.pickup],
          ['delivery', 'Delivery reports', queueCounts.delivery],
          ['closed', 'History', queueCounts.closed],
        ].map(([key, label, count]) => <button key={key} type="button" onClick={() => setFilter(key)} className={filter === key ? 'active' : ''}>{label}<b>{count}</b></button>)}
      </nav>

      {visibleFulfillments.length === 0 ? <div className="cod-ops__empty">No COD tasks in this view.</div> : <div className="cod-ops__list">
        {visibleFulfillments.map((item) => {
          const form = formFor(item);
          const buyerMessage = `Hello ${item.buyer_name || ''}, this is the rifKANDO delivery team about order ${item.order_number}. We are arranging your COD delivery.`;
          const sellerMessage = `Hello ${item.seller_name || ''}, this is Toufiq from rifKANDO delivery about order ${item.order_number}. Please confirm the parcel handoff details.`;
          const buyerWhatsApp = toWhatsApp(item.buyer_phone, buyerMessage);
          const sellerWhatsApp = toWhatsApp(item.seller_phone, sellerMessage);
          const canConfirmPickup = item.status === 'confirmed' && item.delivery_partner_contacted_at;
          const canReportDelivery = item.status === 'shipped' && !item.delivery_reported_at;
          return <article className="cod-ops__card" key={item.fulfillment_id}>
            <div className="cod-ops__topline"><div><div className="cod-ops__order">{item.order_number}<span>{item.source === 'findit' ? 'FINDit' : 'Product'}</span></div><h2>{item.item_title || 'Order item'}</h2></div><strong className={`cod-ops__stage ${item.status}`}>{stageFor(item)}</strong></div>
            <div className="cod-ops__details">
              <section><small>Buyer and destination</small><strong>{item.buyer_name || 'Buyer'}</strong><p>{item.buyer_phone || 'No phone recorded'}<br />{displayAddress(item.shipping_address)}</p>{buyerWhatsApp && <a href={buyerWhatsApp} target="_blank" rel="noreferrer">Message buyer</a>}</section>
              <section><small>Seller and parcel</small><strong>{item.seller_name || 'Seller'}</strong><p>{item.seller_phone || 'No phone recorded'}<br />{item.notes || 'No seller note provided'}</p>{sellerWhatsApp && <a href={sellerWhatsApp} target="_blank" rel="noreferrer">Message seller</a>}</section>
              <section><small>COD collection target</small><strong>{money(item.expected_cod_amount)}</strong><p>This is a delivery reference only. Finance records any real cash evidence separately.</p></section>
            </div>

            {item.carrier_name && <div className="cod-ops__tracking"><b>Carrier:</b> {item.carrier_name} <b>Tracking:</b> {item.tracking_number || 'Not recorded'}</div>}
            {canConfirmPickup && <section className="cod-ops__action"><h3>Confirm parcel pickup</h3><p>The seller requested Toufiq pickup. Record the actual carrier and tracking after you have the parcel.</p><div className="cod-ops__fields"><label>Carrier<select value={form.carrierName || ''} onChange={(event) => updateForm(item, 'carrierName', event.target.value)}><option value="">Select carrier</option><option value="Najm Chamal">Najm Chamal</option><option value="Ghazala">Ghazala</option><option value="Other">Other</option></select></label><label>Tracking number<input value={form.trackingNumber || ''} onChange={(event) => updateForm(item, 'trackingNumber', event.target.value)} placeholder="Carrier tracking" /></label><label>Handoff note<input value={form.pickupNote || ''} onChange={(event) => updateForm(item, 'pickupNote', event.target.value)} placeholder="Optional proof or note" /></label></div><button disabled={processing === `${item.fulfillment_id}:pickup`} onClick={() => void submit(item, 'pickup')}>{processing === `${item.fulfillment_id}:pickup` ? 'Recording…' : 'Confirm pickup'}</button></section>}
            {item.status === 'confirmed' && !item.delivery_partner_contacted_at && <p className="cod-ops__notice">Waiting for the seller to request a Toufiq handoff through the seller dashboard.</p>}
            {canReportDelivery && <section className="cod-ops__action"><h3>Report delivery outcome</h3><p>Report what happened in the field. This does not mark cash as collected or release any seller payment.</p><div className="cod-ops__fields"><label>Outcome<select value={form.outcome || 'delivered'} onChange={(event) => updateForm(item, 'outcome', event.target.value)}><option value="delivered">Delivered to buyer</option><option value="refused">Buyer refused</option><option value="returned">Returned to seller</option></select></label><label className="wide">Report note<input value={form.deliveryNote || ''} onChange={(event) => updateForm(item, 'deliveryNote', event.target.value)} placeholder="Required: date, buyer response, and any carrier evidence" /></label></div><button disabled={processing === `${item.fulfillment_id}:delivery`} onClick={() => void submit(item, 'delivery')}>{processing === `${item.fulfillment_id}:delivery` ? 'Reporting…' : 'Report outcome'}</button></section>}
            {item.delivery_reported_at && <p className="cod-ops__notice success">Reported {item.delivery_report_outcome} on {new Date(item.delivery_reported_at).toLocaleString()}: {item.delivery_report_note}</p>}
          </article>;
        })}
      </div>}
      <style>{`.cod-ops{max-width:78rem;margin:0 auto;padding:1.5rem;color:#10233f}.cod-ops__header{display:flex;justify-content:space-between;gap:1.5rem;align-items:flex-start;margin-bottom:1rem}.cod-ops__header span{color:#168dd9;text-transform:uppercase;font-size:.75rem;letter-spacing:.09em;font-weight:800}.cod-ops h1{margin:.25rem 0;font-size:1.85rem}.cod-ops__header p{max-width:50rem;margin:0;color:#607187;line-height:1.55}.cod-ops button,.cod-ops a{font:inherit}.cod-ops>header button,.cod-ops__action button{border:0;border-radius:.6rem;background:#168dd9;color:#fff;padding:.68rem .95rem;font-weight:750;cursor:pointer;white-space:nowrap}.cod-ops button:disabled{opacity:.6;cursor:wait}.cod-ops__partner{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem 1.1rem;border:1px solid #b9e2fa;background:#f2faff;border-radius:.9rem}.cod-ops__partner div{display:grid;gap:.2rem}.cod-ops__partner span,.cod-ops__details p{color:#607187}.cod-ops__partner a,.cod-ops__details a{color:#0877bf;font-weight:750;text-decoration:none}.cod-ops__filters{display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0}.cod-ops__filters button{border:1px solid #d4e1ea;background:#fff;border-radius:999px;padding:.45rem .7rem;color:#526477;cursor:pointer}.cod-ops__filters button.active{background:#10233f;border-color:#10233f;color:#fff}.cod-ops__filters b{margin-left:.45rem;padding:.08rem .35rem;border-radius:999px;background:rgba(22,141,217,.14);color:inherit}.cod-ops__list{display:grid;gap:1rem}.cod-ops__card{background:#fff;border:1px solid #dbe6ef;border-radius:1rem;padding:1.2rem;box-shadow:0 .5rem 1.5rem rgba(16,35,63,.05)}.cod-ops__topline{display:flex;justify-content:space-between;gap:1rem}.cod-ops__order{font-weight:850}.cod-ops__order span{display:inline-block;margin-left:.5rem;padding:.16rem .42rem;border-radius:99px;background:#e9f6ff;color:#0877bf;font-size:.7rem}.cod-ops h2{font-size:1.1rem;margin:.45rem 0 0}.cod-ops__stage{align-self:start;padding:.36rem .55rem;border-radius:99px;background:#eef2f6;color:#526477;font-size:.75rem;white-space:nowrap}.cod-ops__stage.shipped{background:#fff4d6;color:#935d00}.cod-ops__stage.delivered{background:#e7f8f0;color:#087f52}.cod-ops__details{display:grid;grid-template-columns:1.2fr 1.2fr .9fr;gap:1rem;margin:1rem 0;padding:1rem 0;border-block:1px solid #edf2f6}.cod-ops__details section{display:grid;align-content:start;gap:.3rem}.cod-ops small{color:#6b7b8d;text-transform:uppercase;font-size:.68rem;font-weight:800;letter-spacing:.06em}.cod-ops__details p{margin:0;line-height:1.5;font-size:.9rem;word-break:break-word}.cod-ops__tracking,.cod-ops__notice{margin-top:1rem;padding:.75rem .9rem;border-radius:.65rem;background:#f5f8fb;color:#526477}.cod-ops__tracking b{color:#10233f;margin-right:.25rem}.cod-ops__action{margin-top:1rem;padding:1rem;border-radius:.75rem;background:#f6fbff}.cod-ops__action h3{margin:0;font-size:1rem}.cod-ops__action p{color:#607187;margin:.35rem 0 .8rem;line-height:1.45}.cod-ops__fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;margin-bottom:.75rem}.cod-ops__fields label{display:grid;gap:.3rem;color:#526477;font-size:.77rem;font-weight:750}.cod-ops__fields label.wide{grid-column:span 2}.cod-ops input,.cod-ops select{min-width:0;min-height:2.45rem;border:1px solid #cddbe7;border-radius:.5rem;background:#fff;padding:.45rem .55rem;color:#10233f}.cod-ops__notice.success{background:#e7f8f0;color:#087f52}.cod-ops__empty{padding:3rem;text-align:center;color:#607187;border:1px dashed #c9d8e5;border-radius:1rem;background:#fff}@media(max-width:760px){.cod-ops{padding:1rem}.cod-ops__header,.cod-ops__partner,.cod-ops__topline{flex-direction:column}.cod-ops__header button,.cod-ops__partner a,.cod-ops__action button{width:100%;text-align:center}.cod-ops__details,.cod-ops__fields{grid-template-columns:1fr}.cod-ops__fields label.wide{grid-column:auto}}`}</style>
    </main>
  );
};

export default CODOperationsDesk;
