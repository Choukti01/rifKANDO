import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const money = (value) => `${Number(value || 0).toLocaleString()} MAD`;
const remittanceDue = (item) => Math.max(0, Number(item.collected_amount || 0) - Number(item.carrier_delivery_fee || 0));

const stageLabel = (item) => {
  if (item.status === 'confirmed') return item.delivery_partner_contacted_at ? 'Awaiting Toufiq pickup' : 'Seller has not contacted Toufiq';
  if (item.status === 'shipped') return 'Awaiting buyer delivery and collection';
  if (item.status === 'delivered' && item.settlement_status === 'awaiting_remittance') return 'Awaiting Toufiq remittance';
  if (item.seller_payout_status === 'due') return 'Seller payout due';
  if (item.seller_payout_status === 'paid') return 'Seller payout recorded';
  if (item.settlement_status === 'void') return 'Voided';
  return item.settlement_status;
};

const CODReconciliation = () => {
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [forms, setForms] = useState({});

  const loadFulfillments = async () => {
    try {
      const response = await api.get('/admin/cod-fulfillments');
      setFulfillments(response.data.fulfillments || []);
    } catch (error) {
      console.error('COD reconciliation could not be loaded:', error);
      toast.error(error.response?.data?.error || 'Unable to load COD reconciliation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadFulfillments(); }, []);

  const formFor = (item) => forms[item.fulfillment_id] || {};
  const updateForm = (item, field, value) => setForms((current) => ({
    ...current,
    [item.fulfillment_id]: { ...current[item.fulfillment_id], [field]: value },
  }));

  const actionConfig = (item, action) => {
    const form = formFor(item);
    if (action === 'pickup') return {
      path: `/admin/cod-fulfillments/${item.fulfillment_id}/confirm-pickup`,
      payload: { carrierName: form.carrierName || '', trackingNumber: form.trackingNumber || '', note: form.pickupNote || '' },
      success: 'Toufiq pickup and carrier tracking recorded.',
    };
    if (action === 'collection') return {
      path: `/admin/cod-fulfillments/${item.fulfillment_id}/record-collection`,
      payload: { carrierReference: form.collectionReference || '', collectedAmount: Number(form.collectedAmount), carrierDeliveryFee: Number(form.deliveryFee || 0), carrierReturnFee: 0, note: form.collectionNote || '' },
      success: 'Buyer cash collection recorded.',
    };
    if (action === 'remittance') return {
      path: `/admin/cod-fulfillments/${item.fulfillment_id}/record-remittance`,
      payload: { settlementReference: form.remittanceReference || '', remittedAmount: Number(form.remittedAmount), note: form.remittanceNote || '' },
      success: 'Toufiq remittance recorded. Seller payout is now due.',
    };
    if (action === 'payout') return {
      path: `/admin/cod-fulfillments/${item.fulfillment_id}/record-seller-payout`,
      payload: { payoutReference: form.payoutReference || '', note: form.payoutNote || '' },
      success: 'Seller payout recorded. No wallet balance was credited.',
    };
    return {
      path: `/admin/cod-fulfillments/${item.fulfillment_id}/exception`,
      payload: { status: form.exceptionStatus || 'refused', note: form.exceptionNote || '' },
      success: 'Delivery exception recorded.',
    };
  };

  const submit = async (item, action) => {
    const config = actionConfig(item, action);
    setProcessing(`${item.fulfillment_id}:${action}`);
    try {
      await api.post(config.path, config.payload);
      toast.success(config.success);
      await loadFulfillments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'The COD record could not be updated.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="cod-finance-loading">Loading COD reconciliation…</div>;

  return (
    <main className="cod-finance">
      <header className="cod-finance__header">
        <div><span>Finance control</span><h1>Toufiq COD control</h1><p>Record real-world proof in order: seller pickup request, Toufiq pickup and tracking, buyer collection, Toufiq remittance, then the real seller bank payout. Each financial action is auditable and idempotent.</p></div>
        <button type="button" onClick={() => void loadFulfillments()}>Refresh</button>
      </header>

      {fulfillments.length === 0 ? <div className="cod-finance__empty">There are no COD fulfilments to reconcile.</div> : <div className="cod-finance__list">
        {fulfillments.map((item) => {
          const form = formFor(item);
          const isConfirmed = item.status === 'confirmed';
          const isShipped = item.status === 'shipped';
          const awaitingRemittance = item.status === 'delivered' && item.settlement_status === 'awaiting_remittance';
          const payoutDue = item.seller_payout_status === 'due';
          const exceptionBusy = processing === `${item.fulfillment_id}:exception`;
          return <article className="cod-finance__card" key={item.fulfillment_id}>
            <div className="cod-finance__topline"><div><div className="cod-finance__order">{item.order_number} <span>{item.source === 'findit' ? 'FINDit' : 'Product'}</span></div><p>{item.item_title || 'Order item'} · Buyer: {item.buyer_name} · Seller: {item.seller_name}</p></div><strong className={`cod-finance__stage ${item.settlement_status}`}>{stageLabel(item)}</strong></div>
            <dl className="cod-finance__amounts"><div><dt>Buyer pays</dt><dd>{money(item.expected_cod_amount)}</dd></div><div><dt>Toufiq keeps</dt><dd>{money(item.carrier_delivery_fee || item.customer_delivery_fee)}</dd></div><div><dt>rifKANDO commission</dt><dd>{money(item.commission)}</dd></div><div><dt>Seller payout</dt><dd>{money(item.seller_amount)}</dd></div></dl>

            {isConfirmed && <section className="cod-finance__workflow"><h2>1. Confirm Toufiq pickup</h2>{!item.delivery_partner_contacted_at ? <p>Wait for the seller to use the Toufiq WhatsApp handoff button. Do not invent a pickup record.</p> : <><p>Seller requested pickup {new Date(item.delivery_partner_contacted_at).toLocaleString()}. After Toufiq has the parcel, record the carrier and its tracking number.</p><div className="cod-finance__fields"><label>Carrier<select value={form.carrierName || ''} onChange={(event) => updateForm(item, 'carrierName', event.target.value)}><option value="">Select carrier</option><option value="Najm Chamal">Najm Chamal</option><option value="Ghazala">Ghazala</option><option value="Other">Other</option></select></label><label>Carrier tracking<input value={form.trackingNumber || ''} onChange={(event) => updateForm(item, 'trackingNumber', event.target.value)} placeholder="Tracking number" /></label><label>Pickup note<input value={form.pickupNote || ''} onChange={(event) => updateForm(item, 'pickupNote', event.target.value)} placeholder="Optional handoff evidence" /></label></div><button disabled={processing === `${item.fulfillment_id}:pickup`} onClick={() => submit(item, 'pickup')}>{processing === `${item.fulfillment_id}:pickup` ? 'Recording…' : 'Confirm pickup'}</button></>}</section>}

            {item.carrier_name && <p className="cod-finance__tracking">Toufiq · {item.carrier_name} · {item.tracking_number}</p>}
            {isShipped && <section className="cod-finance__workflow"><h2>2. Record delivery and cash collection</h2><p>Only after Toufiq confirms the buyer received the parcel and paid cash. The collected amount must match the buyer’s COD total.</p><div className="cod-finance__fields"><label>Collection reference<input value={form.collectionReference || ''} onChange={(event) => updateForm(item, 'collectionReference', event.target.value)} placeholder="Carrier or receipt reference" /></label><label>Collected MAD<input type="number" min="0" step="0.01" value={form.collectedAmount ?? item.expected_cod_amount ?? ''} onChange={(event) => updateForm(item, 'collectedAmount', event.target.value)} /></label><label>Toufiq fee MAD<input type="number" min="0" step="0.01" value={form.deliveryFee ?? item.customer_delivery_fee ?? ''} onChange={(event) => updateForm(item, 'deliveryFee', event.target.value)} /></label><label>Note<input value={form.collectionNote || ''} onChange={(event) => updateForm(item, 'collectionNote', event.target.value)} placeholder="Optional delivery proof" /></label></div><button disabled={processing === `${item.fulfillment_id}:collection`} onClick={() => submit(item, 'collection')}>{processing === `${item.fulfillment_id}:collection` ? 'Recording…' : 'Record collection'}</button><ExceptionControls item={item} form={form} updateForm={updateForm} submit={submit} busy={exceptionBusy} /></section>}

            {awaitingRemittance && <section className="cod-finance__workflow"><h2>3. Record Toufiq remittance to rifKANDO</h2><p>Expected after Toufiq’s recorded fee: <strong>{money(remittanceDue(item))}</strong>. Confirm the money is actually received before recording it.</p><div className="cod-finance__fields"><label>Remittance reference<input value={form.remittanceReference || ''} onChange={(event) => updateForm(item, 'remittanceReference', event.target.value)} placeholder="Cash receipt or bank reference" /></label><label>Received MAD<input type="number" min="0" step="0.01" value={form.remittedAmount ?? remittanceDue(item)} onChange={(event) => updateForm(item, 'remittedAmount', event.target.value)} /></label><label>Note<input value={form.remittanceNote || ''} onChange={(event) => updateForm(item, 'remittanceNote', event.target.value)} placeholder="Optional reconciliation note" /></label></div><button disabled={processing === `${item.fulfillment_id}:remittance`} onClick={() => submit(item, 'remittance')}>{processing === `${item.fulfillment_id}:remittance` ? 'Recording…' : 'Record remittance'}</button></section>}

            {payoutDue && <section className="cod-finance__workflow"><h2>4. Record seller payout</h2><p>Send exactly <strong>{money(item.seller_amount)}</strong> to the seller outside rifKANDO, then record the real transfer reference. rifKANDO retains the 5% commission automatically in the reconciliation record.</p><div className="cod-finance__fields"><label>Seller transfer reference<input value={form.payoutReference || ''} onChange={(event) => updateForm(item, 'payoutReference', event.target.value)} placeholder="Attijari transfer reference" /></label><label>Note<input value={form.payoutNote || ''} onChange={(event) => updateForm(item, 'payoutNote', event.target.value)} placeholder="Optional payout note" /></label></div><button disabled={processing === `${item.fulfillment_id}:payout`} onClick={() => submit(item, 'payout')}>{processing === `${item.fulfillment_id}:payout` ? 'Recording…' : 'Record seller payout'}</button></section>}

            {item.seller_payout_status === 'paid' && <p className="cod-finance__success">Seller payout recorded: {item.seller_payout_reference}.</p>}
            {item.settlement_status === 'void' && <p className="cod-finance__void">{item.exception_note || 'This COD fulfilment was voided.'}</p>}
          </article>;
        })}
      </div>}
      <style>{`.cod-finance { max-width:76rem;margin:0 auto;padding:1.5rem;color:#10233f; }.cod-finance__header { display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.5rem; }.cod-finance__header span { color:#168dd9;text-transform:uppercase;font-weight:800;font-size:.75rem;letter-spacing:.09em; }.cod-finance__header h1 { margin:.25rem 0;font-size:1.8rem; }.cod-finance__header p { max-width:48rem;margin:0;color:#607187;line-height:1.55; }.cod-finance button { border:0;border-radius:.55rem;background:#168dd9;color:#fff;padding:.65rem .9rem;font-weight:750;cursor:pointer; }.cod-finance button:hover:not(:disabled) { background:#0877bf; }.cod-finance button:disabled { opacity:.6;cursor:wait; }.cod-finance__list { display:grid;gap:1rem; }.cod-finance__card { background:#fff;border:1px solid #dbe6ef;border-radius:1rem;padding:1.25rem;box-shadow:0 .5rem 1.5rem rgba(16,35,63,.05); }.cod-finance__topline { display:flex;justify-content:space-between;gap:1rem; }.cod-finance__order { font-weight:800; }.cod-finance__order span { display:inline-block;margin-left:.4rem;padding:.18rem .45rem;border-radius:99px;background:#e9f6ff;color:#0877bf;font-size:.7rem; }.cod-finance__topline p,.cod-finance__tracking { margin:.35rem 0 0;color:#62748a; }.cod-finance__stage { align-self:start;padding:.4rem .55rem;border-radius:99px;font-size:.75rem;white-space:nowrap;background:#eef2f6;color:#526477; }.cod-finance__stage.awaiting_remittance { background:#fff4d6;color:#a65f00; }.cod-finance__stage.settled { background:#e7f8f0;color:#087f52; }.cod-finance__stage.void { background:#fff0f0;color:#b42318; }.cod-finance__amounts { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem;margin:1rem 0;padding:1rem 0;border-block:1px solid #edf2f6; }.cod-finance__amounts dt { color:#6b7b8d;font-size:.76rem; }.cod-finance__amounts dd { margin:.25rem 0 0;font-weight:800; }.cod-finance__workflow { margin-top:1rem;padding:1rem;border-radius:.75rem;background:#f6fbff; }.cod-finance__workflow h2 { margin:0;font-size:1rem; }.cod-finance__workflow p { color:#607187;margin:.35rem 0 .85rem;line-height:1.45; }.cod-finance__fields { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.65rem;margin-bottom:.75rem; }.cod-finance__fields label { display:grid;gap:.35rem;color:#526477;font-size:.78rem;font-weight:700; }.cod-finance input,.cod-finance select { min-width:0;min-height:2.45rem;padding:.45rem .55rem;border:1px solid #cddbe7;border-radius:.5rem;background:#fff;color:#10233f; }.cod-finance__exception { display:flex;gap:.55rem;align-items:center;margin-top:.75rem; }.cod-finance__exception input { flex:1; }.cod-finance__exception .quiet { background:#fff;color:#526477;border:1px solid #cddbe7; }.cod-finance__success { margin:1rem 0 0;color:#087f52;font-weight:700; }.cod-finance__void { margin:1rem 0 0;color:#b42318; }.cod-finance__empty,.cod-finance-loading { padding:3rem;text-align:center;color:#607187;border:1px dashed #c9d8e5;border-radius:1rem;background:#fff; } @media(max-width:760px){.cod-finance { padding:1rem; }.cod-finance__header,.cod-finance__topline { flex-direction:column; }.cod-finance__amounts,.cod-finance__fields { grid-template-columns:1fr 1fr; }.cod-finance__workflow button { width:100%; }.cod-finance__exception { flex-direction:column;align-items:stretch; }}`}</style>
    </main>
  );
};

const ExceptionControls = ({ item, form, updateForm, submit, busy }) => (
  <div className="cod-finance__exception"><select value={form.exceptionStatus || 'refused'} onChange={(event) => updateForm(item, 'exceptionStatus', event.target.value)}><option value="refused">Customer refused</option><option value="returned">Returned to seller</option></select><input placeholder="Carrier exception note" value={form.exceptionNote || ''} onChange={(event) => updateForm(item, 'exceptionNote', event.target.value)} /><button className="quiet" disabled={busy} onClick={() => submit(item, 'exception')}>{busy ? 'Recording…' : 'Record exception'}</button></div>
);

export default CODReconciliation;
