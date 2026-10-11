import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChatBubbleLeftRightIcon, ExclamationTriangleIcon, PaperAirplaneIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const reasonOptions = [
  ['not_received', 'Parcel was not received'],
  ['wrong_item', 'Wrong item received'],
  ['damaged', 'Item arrived damaged'],
  ['not_as_described', 'Item is not as described'],
  ['delivery_issue', 'Delivery issue'],
  ['other', 'Other issue'],
];

const statusLabel = (status) => ({
  open: 'Open', in_review: 'Under review', resolved_buyer: 'Resolved for buyer',
  resolved_seller: 'Resolved for seller', return_required: 'Return required', closed: 'Closed',
}[status] || status);

const OrderDisputes = ({ order }) => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingFor, setOpeningFor] = useState(null);
  const [forms, setForms] = useState({});
  const [sending, setSending] = useState(null);

  const fulfillments = useMemo(() => (order.fulfillments || []).filter((item) => ['shipped', 'delivered', 'refused', 'returned'].includes(item.status)), [order.fulfillments]);

  const load = useCallback(async (orderId = order.id) => {
    try {
      const response = await api.get(`/disputes/mine?orderId=${orderId}`);
      setDisputes(response.data.disputes || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load delivery support.');
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      void load(order.id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, order.id]);

  const updateForm = (fulfillmentId, key, value) => setForms((current) => ({
    ...current,
    [fulfillmentId]: { reason: 'not_as_described', description: '', message: '', ...(current[fulfillmentId] || {}), [key]: value },
  }));

  const openDispute = async (fulfillmentId) => {
    const form = forms[fulfillmentId] || {};
    if ((form.description || '').trim().length < 10) return toast.error('Please describe the issue in at least 10 characters.');
    setSending(`open:${fulfillmentId}`);
    try {
      await api.post(`/fulfillments/${fulfillmentId}/disputes`, { reason: form.reason || 'not_as_described', description: form.description.trim() });
      toast.success('Your dispute was sent to rifKANDO for review.');
      setOpeningFor(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to open the dispute.');
    } finally {
      setSending(null);
    }
  };

  const sendMessage = async (disputeId, fulfillmentId) => {
    const message = forms[fulfillmentId]?.message || '';
    if (message.trim().length < 3) return toast.error('Write at least 3 characters before sending.');
    setSending(`message:${disputeId}`);
    try {
      await api.post(`/disputes/${disputeId}/messages`, { message: message.trim() });
      updateForm(fulfillmentId, 'message', '');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to send this update.');
    } finally {
      setSending(null);
    }
  };

  if (!fulfillments.length && !disputes.length) return null;

  return <section className="order-disputes" aria-label="Delivery support and disputes">
    <header>
      <div><span className="order-disputes__eyebrow"><ShieldCheckIcon aria-hidden="true" />rifKANDO purchase protection</span><h2>Delivery support and disputes</h2><p>Use this only for a real delivery issue. rifKANDO records every update and keeps COD settlement separate until the case is reviewed.</p></div>
    </header>

    {loading ? <div className="order-disputes__loading">Loading delivery support…</div> : <div className="order-disputes__list">
      {disputes.map((dispute) => {
        const active = ['open', 'in_review'].includes(dispute.status);
        const fulfillmentId = dispute.fulfillment_id;
        return <article className="order-dispute" key={dispute.id}>
          <div className="order-dispute__topline"><div><span className="order-dispute__label">{dispute.item_title || 'Marketplace item'}</span><h3>{reasonOptions.find(([value]) => value === dispute.reason)?.[1] || dispute.reason}</h3></div><span className={`order-dispute__status order-dispute__status--${dispute.status}`}>{statusLabel(dispute.status)}</span></div>
          <p className="order-dispute__description">{dispute.description}</p>
          {dispute.resolution && <div className="order-dispute__resolution"><strong>rifKANDO decision</strong><p>{dispute.resolution}</p></div>}
          <ol className="order-dispute__events">
            {(dispute.events || []).map((event) => <li key={event.id}><span /><div><strong>{event.event_type === 'decision' ? 'rifKANDO decision' : event.actor_name || 'rifKANDO update'}</strong><p>{event.body}</p><small>{new Date(event.created_at).toLocaleString()}</small></div></li>)}
          </ol>
          {active && <div className="order-dispute__message"><label htmlFor={`dispute-message-${dispute.id}`}>Add an update</label><div><input id={`dispute-message-${dispute.id}`} value={forms[fulfillmentId]?.message || ''} maxLength="1500" onChange={(event) => updateForm(fulfillmentId, 'message', event.target.value)} placeholder="Add a factual delivery update" /><button type="button" disabled={sending === `message:${dispute.id}`} onClick={() => void sendMessage(dispute.id, fulfillmentId)}><PaperAirplaneIcon aria-hidden="true" />{sending === `message:${dispute.id}` ? 'Sending…' : 'Send'}</button></div></div>}
        </article>;
      })}

      {fulfillments.filter((fulfillment) => !disputes.some((dispute) => Number(dispute.fulfillment_id) === Number(fulfillment.id) && ['open', 'in_review'].includes(dispute.status))).map((fulfillment) => <article className="order-dispute order-dispute--start" key={fulfillment.id}>
        {openingFor === fulfillment.id ? <div className="order-dispute__form"><div className="order-dispute__topline"><div><span className="order-dispute__label">Delivery record #{fulfillment.id}</span><h3>Tell us what happened</h3></div><button type="button" className="order-dispute__text-button" onClick={() => setOpeningFor(null)}>Cancel</button></div><label>Issue type<select value={forms[fulfillment.id]?.reason || 'not_as_described'} onChange={(event) => updateForm(fulfillment.id, 'reason', event.target.value)}>{reasonOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>What should rifKANDO review?<textarea value={forms[fulfillment.id]?.description || ''} maxLength="1500" onChange={(event) => updateForm(fulfillment.id, 'description', event.target.value)} placeholder="Describe what happened, including delivery details. Do not share bank or account information." /></label><button type="button" className="order-dispute__primary" disabled={sending === `open:${fulfillment.id}`} onClick={() => void openDispute(fulfillment.id)}>{sending === `open:${fulfillment.id}` ? 'Sending…' : 'Open dispute'}</button></div> : <><div><span className="order-dispute__label">Delivery record #{fulfillment.id}</span><h3>Something wrong with this delivery?</h3><p>Open a private case for a missing, damaged, wrong, or misleading item. This does not automatically create a refund or change COD settlement.</p></div><button type="button" className="order-dispute__secondary" onClick={() => setOpeningFor(fulfillment.id)}><ExclamationTriangleIcon aria-hidden="true" />Get help</button></>}
      </article>)}
    </div>}

    <style>{`
      .order-disputes{background:#fff;border:1px solid #dce7ec;border-radius:20px;margin:1.5rem 0;padding:1.35rem;box-shadow:0 10px 30px rgba(18,45,62,.06)}.order-disputes header{display:flex;gap:1rem;justify-content:space-between}.order-disputes h2{font-size:1.2rem;margin:.25rem 0}.order-disputes p{color:#52636d;line-height:1.55}.order-disputes__eyebrow{align-items:center;color:#216275;display:flex;font-size:.72rem;font-weight:800;gap:.35rem;letter-spacing:.07em;text-transform:uppercase}.order-disputes__eyebrow svg{height:1rem;width:1rem}.order-disputes__loading{color:#52636d;padding:1rem 0}.order-disputes__list{display:grid;gap:1rem;margin-top:1rem}.order-dispute{border:1px solid #e2eaee;border-radius:16px;padding:1rem}.order-dispute--start{align-items:center;background:#f8fbfc;display:flex;gap:1rem;justify-content:space-between}.order-dispute__topline{align-items:flex-start;display:flex;gap:1rem;justify-content:space-between}.order-dispute h3{font-size:1rem;margin:.2rem 0}.order-dispute__label{color:#216275;font-size:.78rem;font-weight:800}.order-dispute__status{border-radius:999px;font-size:.75rem;font-weight:800;padding:.35rem .6rem;white-space:nowrap}.order-dispute__status--open,.order-dispute__status--in_review{background:#fff4d7;color:#885900}.order-dispute__status--resolved_buyer{background:#e6f6ee;color:#17633b}.order-dispute__status--resolved_seller,.order-dispute__status--closed{background:#eef2f4;color:#42535d}.order-dispute__status--return_required{background:#fff0e9;color:#a34213}.order-dispute__description{margin:.75rem 0}.order-dispute__resolution{background:#edf8fa;border-inline-start:3px solid #216275;border-radius:8px;padding:.7rem .8rem}.order-dispute__resolution p{margin:.25rem 0 0}.order-dispute__events{border-inline-start:1px solid #d7e4e8;list-style:none;margin:1rem 0;padding-inline-start:1rem}.order-dispute__events li{display:flex;gap:.7rem;margin-bottom:.8rem}.order-dispute__events li>span{background:#216275;border:2px solid #e7f3f5;border-radius:50%;height:.55rem;flex:0 0 .55rem;margin-inline-start:-1.31rem;margin-top:.38rem}.order-dispute__events p{margin:.15rem 0;font-size:.9rem}.order-dispute__events small{color:#71818a}.order-dispute__message label,.order-dispute__form label{display:block;font-size:.82rem;font-weight:750;margin:.7rem 0 .35rem}.order-dispute__message>div{display:flex;gap:.5rem}.order-dispute input,.order-dispute select,.order-dispute textarea{border:1px solid #c8d8df;border-radius:10px;box-sizing:border-box;font:inherit;padding:.65rem;width:100%}.order-dispute textarea{min-height:96px;resize:vertical}.order-dispute button{border:0;border-radius:10px;cursor:pointer;font:inherit;font-weight:750;padding:.65rem .85rem}.order-dispute button:disabled{cursor:not-allowed;opacity:.65}.order-dispute__message button,.order-dispute__primary{align-items:center;background:#216275;color:#fff;display:inline-flex;gap:.35rem;justify-content:center}.order-dispute__message button svg,.order-dispute__secondary svg{height:1rem;width:1rem}.order-dispute__secondary{align-items:center;background:#e4f3f6;color:#174d5d;display:flex;gap:.4rem;white-space:nowrap}.order-dispute__text-button{background:transparent;color:#52636d;padding:0}.order-dispute__primary{margin-top:.85rem}.order-dispute__form{width:100%}@media(max-width:640px){.order-disputes{border-radius:16px;padding:1rem}.order-dispute--start{align-items:stretch;flex-direction:column}.order-dispute--start button{width:100%}.order-dispute__message>div{flex-direction:column}.order-dispute__message button{width:100%}.order-dispute__topline{gap:.55rem}.order-dispute__status{font-size:.7rem}}
    `}</style>
  </section>;
};

export default OrderDisputes;
