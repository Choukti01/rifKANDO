import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChatBubbleLeftRightIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';

const labels = { open: 'Open', in_review: 'Under review', resolved_buyer: 'Resolved for buyer', resolved_seller: 'Resolved for seller', return_required: 'Return required', closed: 'Closed' };

const SellerDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState({});
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/disputes/mine');
      setDisputes(response.data.disputes || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load disputes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sendMessage = async (disputeId) => {
    const message = (messages[disputeId] || '').trim();
    if (message.length < 3) return toast.error('Write at least 3 characters before sending.');
    setSending(disputeId);
    try {
      await api.post(`/disputes/${disputeId}/messages`, { message });
      setMessages((current) => ({ ...current, [disputeId]: '' }));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to send this update.');
    } finally {
      setSending(null);
    }
  };

  if (loading) return <div className="seller-disputes__state">Loading disputes…</div>;

  return <main className="seller-disputes">
    <header><span><ShieldExclamationIcon aria-hidden="true" />Marketplace trust</span><h1>Delivery disputes</h1><p>Respond with factual order and delivery information. rifKANDO’s COD reconciliation team makes the final decision and records it here.</p></header>
    {!disputes.length ? <section className="seller-disputes__empty"><ShieldExclamationIcon aria-hidden="true" /><h2>No delivery disputes</h2><p>When a buyer opens a delivery dispute, its case and updates appear here.</p></section> : <div className="seller-disputes__grid">{disputes.map((dispute) => {
      const active = ['open', 'in_review'].includes(dispute.status);
      return <article key={dispute.id} className="seller-dispute-card"><div className="seller-dispute-card__top"><div><small>Order {dispute.order_number}</small><h2>{dispute.item_title || 'Marketplace item'}</h2></div><span className={`seller-dispute-card__status seller-dispute-card__status--${dispute.status}`}>{labels[dispute.status] || dispute.status}</span></div><p className="seller-dispute-card__reason"><strong>Buyer report:</strong> {dispute.description}</p>{dispute.resolution && <div className="seller-dispute-card__decision"><strong>rifKANDO decision</strong><p>{dispute.resolution}</p></div>}<ol className="seller-dispute-card__events">{(dispute.events || []).map((event) => <li key={event.id}><strong>{event.event_type === 'decision' ? 'rifKANDO decision' : event.actor_name || 'Update'}</strong><p>{event.body}</p><small>{new Date(event.created_at).toLocaleString()}</small></li>)}</ol>{active && <div className="seller-dispute-card__reply"><label htmlFor={`seller-dispute-${dispute.id}`}>Add a factual response</label><div><input id={`seller-dispute-${dispute.id}`} value={messages[dispute.id] || ''} onChange={(event) => setMessages((current) => ({ ...current, [dispute.id]: event.target.value }))} maxLength="1500" placeholder="Delivery or item information for the review team" /><button type="button" disabled={sending === dispute.id} onClick={() => void sendMessage(dispute.id)}><ChatBubbleLeftRightIcon aria-hidden="true" />{sending === dispute.id ? 'Sending…' : 'Send update'}</button></div></div>}</article>;
    })}</div>}
    <style>{`.seller-disputes{margin:0 auto;max-width:980px;padding:1.25rem}.seller-disputes header{background:linear-gradient(135deg,#0c2d3a,#216275);border-radius:20px;color:#fff;padding:1.5rem}.seller-disputes header span{align-items:center;color:#bce9f2;display:flex;font-size:.72rem;font-weight:800;gap:.35rem;letter-spacing:.08em;text-transform:uppercase}.seller-disputes header span svg{height:1rem;width:1rem}.seller-disputes h1{font-size:1.7rem;margin:.3rem 0}.seller-disputes header p{color:#deeff3;margin:0;max-width:680px}.seller-disputes__grid{display:grid;gap:1rem;margin-top:1rem}.seller-disputes__empty,.seller-dispute-card{background:#fff;border:1px solid #dfe8ec;border-radius:18px;padding:1.1rem}.seller-disputes__empty{text-align:center;margin-top:1rem}.seller-disputes__empty svg{color:#216275;height:2rem;width:2rem}.seller-disputes__empty h2{margin:.5rem 0}.seller-disputes__empty p,.seller-dispute-card p{color:#52636d}.seller-disputes__state{padding:2rem;text-align:center}.seller-dispute-card__top{align-items:flex-start;display:flex;gap:1rem;justify-content:space-between}.seller-dispute-card__top h2{font-size:1.05rem;margin:.2rem 0}.seller-dispute-card__top small{color:#216275;font-weight:800}.seller-dispute-card__status{border-radius:999px;font-size:.72rem;font-weight:800;padding:.35rem .6rem;white-space:nowrap}.seller-dispute-card__status--open,.seller-dispute-card__status--in_review{background:#fff4d7;color:#885900}.seller-dispute-card__status--resolved_buyer{background:#e6f6ee;color:#17633b}.seller-dispute-card__status--return_required{background:#fff0e9;color:#a34213}.seller-dispute-card__status--resolved_seller,.seller-dispute-card__status--closed{background:#eef2f4;color:#42535d}.seller-dispute-card__reason{background:#f7fafb;border-radius:10px;padding:.7rem}.seller-dispute-card__decision{background:#edf8fa;border-inline-start:3px solid #216275;border-radius:8px;padding:.65rem .8rem}.seller-dispute-card__decision p{margin:.2rem 0}.seller-dispute-card__events{border-inline-start:1px solid #dae6ea;list-style:none;margin:1rem 0;padding-inline-start:1rem}.seller-dispute-card__events li{margin-bottom:.65rem}.seller-dispute-card__events p{font-size:.9rem;margin:.15rem 0}.seller-dispute-card__events small{color:#71818a}.seller-dispute-card__reply label{display:block;font-size:.8rem;font-weight:800;margin-bottom:.35rem}.seller-dispute-card__reply>div{display:flex;gap:.5rem}.seller-dispute-card input{border:1px solid #c8d8df;border-radius:10px;font:inherit;padding:.65rem;width:100%}.seller-dispute-card button{align-items:center;background:#216275;border:0;border-radius:10px;color:#fff;cursor:pointer;display:inline-flex;font:inherit;font-weight:800;gap:.35rem;padding:.65rem .85rem;white-space:nowrap}.seller-dispute-card button svg{height:1rem;width:1rem}.seller-dispute-card button:disabled{opacity:.65}@media(max-width:640px){.seller-disputes{padding:1rem}.seller-disputes header{border-radius:16px;padding:1.15rem}.seller-dispute-card__top,.seller-dispute-card__reply>div{flex-direction:column}.seller-dispute-card__status{align-self:flex-start}.seller-dispute-card button{justify-content:center;width:100%}}`}</style>
  </main>;
};

export default SellerDisputes;
