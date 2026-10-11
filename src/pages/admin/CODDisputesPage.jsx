import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const decisions = [
  ['in_review', 'Move to review', 'The COD team is checking delivery evidence and participant updates.'],
  ['return_required', 'Require return', 'Operations must arrange and record the return workflow before any settlement action.'],
  ['resolved_buyer', 'Resolve for buyer', 'The decision supports the buyer. Any financial follow-up remains a separate reconciliation action.'],
  ['resolved_seller', 'Resolve for seller', 'The decision supports the seller. Any financial follow-up remains a separate reconciliation action.'],
  ['closed', 'Close case', 'The case is complete and no further dispute messages can be added.'],
];
const statusLabel = (status) => ({ open: 'Open', in_review: 'Under review', return_required: 'Return required', resolved_buyer: 'Resolved for buyer', resolved_seller: 'Resolved for seller', closed: 'Closed' }[status] || status);

const CODDisputesPage = () => {
  const [disputes, setDisputes] = useState([]);
  const [canResolve, setCanResolve] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [reviewing, setReviewing] = useState(null);
  const [decision, setDecision] = useState('in_review');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [teamMessages, setTeamMessages] = useState({});
  const [messageSaving, setMessageSaving] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/disputes/team');
      setDisputes(response.data.disputes || []);
      setCanResolve(Boolean(response.data.canResolve));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load COD disputes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const visible = disputes.filter((item) => filter === 'all' || (filter === 'active' ? ['open', 'in_review'].includes(item.status) : item.status === filter));
  const submit = async () => {
    if (note.trim().length < 3) return toast.error('A clear decision note is required.');
    setSaving(true);
    try {
      await api.patch(`/disputes/${reviewing.id}/decision`, { status: decision, resolution: note.trim() });
      toast.success('Dispute decision recorded.');
      setReviewing(null);
      setNote('');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to record this decision.');
    } finally { setSaving(false); }
  };
  const sendTeamMessage = async (disputeId) => {
    const message = (teamMessages[disputeId] || '').trim();
    if (message.length < 3) return toast.error('Write at least 3 characters before sending.');
    setMessageSaving(disputeId);
    try {
      await api.post(`/disputes/${disputeId}/messages`, { message });
      setTeamMessages((current) => ({ ...current, [disputeId]: '' }));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to record this update.');
    } finally { setMessageSaving(null); }
  };

  if (loading) return <main className="cod-disputes"><div className="cod-disputes__state">Loading COD disputes…</div></main>;
  return <main className="cod-disputes">
    <header className="cod-disputes__hero"><div><span><ShieldCheckIcon aria-hidden="true" />COD control</span><h1>Delivery disputes desk</h1><p>Review buyer and seller updates with delivery evidence. This desk records decisions but never creates an automatic refund, payout, or cash adjustment.</p></div><Link to={canResolve ? '/admin/cod-reconciliation' : '/operations/cod'}><ClipboardDocumentCheckIcon aria-hidden="true" />Back to COD desk</Link></header>
    <nav className="cod-disputes__filters" aria-label="Dispute filters">{[['active', 'Active'], ['open', 'Open'], ['in_review', 'Under review'], ['return_required', 'Return required'], ['all', 'All cases']].map(([key, label]) => <button type="button" key={key} className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)}>{label} <span>{key === 'all' ? disputes.length : key === 'active' ? disputes.filter((item) => ['open', 'in_review'].includes(item.status)).length : disputes.filter((item) => item.status === key).length}</span></button>)}</nav>
    {!canResolve && <aside className="cod-disputes__notice"><ExclamationTriangleIcon aria-hidden="true" /><p>You can coordinate delivery facts and see the case trail. Only COD Reconciliation controllers can make the final decision.</p></aside>}
    {!visible.length ? <section className="cod-disputes__empty"><CheckCircleIcon aria-hidden="true" /><h2>No matching disputes</h2><p>Delivery disputes will appear here when a buyer or seller reports a real issue.</p></section> : <div className="cod-disputes__list">{visible.map((item) => <article key={item.id} className="cod-dispute-card"><div className="cod-dispute-card__top"><div><span>Order {item.order_number} · Fulfillment #{item.fulfillment_id}</span><h2>{item.item_title || 'Marketplace item'}</h2><p>Buyer: {item.buyer_name} · Seller: {item.seller_name}</p></div><strong className={`cod-dispute-card__status cod-dispute-card__status--${item.status}`}>{statusLabel(item.status)}</strong></div><div className="cod-dispute-card__facts"><div><span>Reason</span><strong>{String(item.reason || '').replaceAll('_', ' ')}</strong></div><div><span>Parcel state</span><strong>{item.fulfillment_status}</strong></div><div><span>Carrier</span><strong>{item.carrier_name || 'Not recorded'}</strong></div><div><span>Tracking</span><strong>{item.tracking_number || 'Not recorded'}</strong></div></div><p className="cod-dispute-card__description">{item.description}</p>{item.resolution && <section className="cod-dispute-card__decision"><strong>Recorded decision</strong><p>{item.resolution}</p></section>}<ol className="cod-dispute-card__events">{(item.events || []).map((event) => <li key={event.id}><strong>{event.event_type === 'decision' ? 'Decision' : event.actor_name || 'Update'}</strong><p>{event.body}</p><small>{new Date(event.created_at).toLocaleString()}</small></li>)}</ol>{['open', 'in_review'].includes(item.status) && <div className="cod-dispute-card__message"><label htmlFor={`team-dispute-${item.id}`}>Add delivery evidence or coordination note</label><div><input id={`team-dispute-${item.id}`} value={teamMessages[item.id] || ''} maxLength="1500" onChange={(event) => setTeamMessages((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Carrier update, contact attempt, or factual evidence" /><button type="button" disabled={messageSaving === item.id} onClick={() => void sendTeamMessage(item.id)}>{messageSaving === item.id ? 'Saving…' : 'Add update'}</button></div></div>}{canResolve && ['open', 'in_review'].includes(item.status) && <button type="button" className="cod-dispute-card__review" onClick={() => { setReviewing(item); setDecision(item.status === 'open' ? 'in_review' : 'closed'); setNote(''); }}>Review case</button>}</article>)}</div>}
    {reviewing && <div className="cod-disputes__modal-backdrop" role="presentation"><section className="cod-disputes__modal" role="dialog" aria-modal="true" aria-labelledby="dispute-decision-title"><header><div><span>Order {reviewing.order_number}</span><h2 id="dispute-decision-title">Record a COD dispute decision</h2></div><button type="button" onClick={() => !saving && setReviewing(null)}>Close</button></header><label>Decision<select value={decision} onChange={(event) => setDecision(event.target.value)}>{decisions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><p className="cod-disputes__decision-help">{decisions.find(([value]) => value === decision)?.[2]}</p><label>Internal decision note and participant update<textarea value={note} maxLength="1500" onChange={(event) => setNote(event.target.value)} placeholder="State the evidence reviewed, the decision, and any next action." /></label><footer><button type="button" className="quiet" disabled={saving} onClick={() => setReviewing(null)}>Cancel</button><button type="button" className="primary" disabled={saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Record decision'}</button></footer></section></div>}
    <style>{`.cod-disputes{margin:0 auto;max-width:1120px;padding:1.25rem}.cod-disputes__hero{align-items:flex-end;background:linear-gradient(135deg,#102d3a,#216275);border-radius:22px;color:#fff;display:flex;gap:1rem;justify-content:space-between;padding:1.5rem}.cod-disputes__hero span{align-items:center;color:#bce9f2;display:flex;font-size:.72rem;font-weight:800;gap:.35rem;letter-spacing:.08em;text-transform:uppercase}.cod-disputes__hero span svg{height:1rem;width:1rem}.cod-disputes__hero h1{font-size:1.7rem;margin:.3rem 0}.cod-disputes__hero p{color:#d7edf2;margin:0;max-width:720px}.cod-disputes__hero a{align-items:center;background:#fff;border-radius:10px;color:#174d5d;display:inline-flex;font-size:.85rem;font-weight:800;gap:.4rem;padding:.7rem .85rem;text-decoration:none;white-space:nowrap}.cod-disputes__hero a svg{height:1rem;width:1rem}.cod-disputes__filters{display:flex;gap:.55rem;margin:1rem 0;overflow:auto;padding-bottom:.15rem}.cod-disputes__filters button{background:#fff;border:1px solid #dce7ec;border-radius:999px;color:#42535d;cursor:pointer;font:inherit;font-size:.82rem;font-weight:800;padding:.5rem .7rem;white-space:nowrap}.cod-disputes__filters button.is-active{background:#216275;border-color:#216275;color:#fff}.cod-disputes__filters span{background:rgba(255,255,255,.35);border-radius:999px;margin-inline-start:.2rem;padding:.1rem .35rem}.cod-disputes__notice{align-items:flex-start;background:#fff4d7;border:1px solid #f3d47d;border-radius:12px;color:#704f00;display:flex;gap:.6rem;padding:.75rem}.cod-disputes__notice svg{height:1.2rem;flex:0 0 1.2rem}.cod-disputes__notice p{margin:0}.cod-disputes__empty{background:#fff;border:1px solid #dce7ec;border-radius:18px;margin-top:1rem;padding:2rem;text-align:center}.cod-disputes__empty svg{color:#216275;height:2.2rem;width:2.2rem}.cod-disputes__empty h2{margin:.5rem 0}.cod-disputes__empty p{color:#52636d}.cod-disputes__list{display:grid;gap:1rem}.cod-dispute-card{background:#fff;border:1px solid #dce7ec;border-radius:18px;padding:1.1rem}.cod-dispute-card__top{align-items:flex-start;display:flex;gap:1rem;justify-content:space-between}.cod-dispute-card__top span{color:#216275;font-size:.8rem;font-weight:800}.cod-dispute-card__top h2{font-size:1.1rem;margin:.2rem 0}.cod-dispute-card__top p{color:#5d6f78;margin:0}.cod-dispute-card__status{border-radius:999px;font-size:.72rem;padding:.35rem .6rem;white-space:nowrap}.cod-dispute-card__status--open,.cod-dispute-card__status--in_review{background:#fff4d7;color:#885900}.cod-dispute-card__status--return_required{background:#fff0e9;color:#a34213}.cod-dispute-card__status--resolved_buyer{background:#e6f6ee;color:#17633b}.cod-dispute-card__status--resolved_seller,.cod-dispute-card__status--closed{background:#eef2f4;color:#42535d}.cod-dispute-card__facts{display:grid;gap:.6rem;grid-template-columns:repeat(4,minmax(0,1fr));margin:1rem 0}.cod-dispute-card__facts div{background:#f7fafb;border-radius:10px;padding:.6rem}.cod-dispute-card__facts span{color:#6d7c84;display:block;font-size:.7rem;font-weight:800;text-transform:uppercase}.cod-dispute-card__facts strong{display:block;font-size:.87rem;margin-top:.2rem;text-transform:capitalize}.cod-dispute-card__description{color:#344851}.cod-dispute-card__decision{background:#edf8fa;border-inline-start:3px solid #216275;border-radius:8px;padding:.7rem .85rem}.cod-dispute-card__decision p{margin:.2rem 0}.cod-dispute-card__events{border-inline-start:1px solid #dae6ea;list-style:none;margin:1rem 0;padding-inline-start:1rem}.cod-dispute-card__events li{margin-bottom:.6rem}.cod-dispute-card__events p{color:#52636d;margin:.12rem 0}.cod-dispute-card__events small{color:#71818a}.cod-dispute-card__message label{display:block;font-size:.8rem;font-weight:800;margin-bottom:.35rem}.cod-dispute-card__message>div{display:flex;gap:.5rem}.cod-dispute-card__message input{border:1px solid #c8d8df;border-radius:10px;font:inherit;padding:.65rem;width:100%}.cod-dispute-card__message button,.cod-dispute-card__review{background:#216275;border:0;border-radius:10px;color:#fff;cursor:pointer;font:inherit;font-weight:800;padding:.65rem .85rem}.cod-dispute-card__message button:disabled{opacity:.65}.cod-disputes__modal-backdrop{align-items:center;background:rgba(11,33,42,.58);display:flex;inset:0;justify-content:center;padding:1rem;position:fixed;z-index:100}.cod-disputes__modal{background:#fff;border-radius:18px;max-width:600px;padding:1.1rem;width:min(100%,600px)}.cod-disputes__modal header{align-items:flex-start;display:flex;justify-content:space-between}.cod-disputes__modal header span{color:#216275;font-size:.8rem;font-weight:800}.cod-disputes__modal h2{margin:.25rem 0}.cod-disputes__modal header button,.cod-disputes__modal .quiet{background:transparent;border:0;color:#52636d;cursor:pointer;font:inherit}.cod-disputes__modal label{display:block;font-size:.82rem;font-weight:800;margin-top:1rem}.cod-disputes__modal select,.cod-disputes__modal textarea{border:1px solid #c8d8df;border-radius:10px;box-sizing:border-box;font:inherit;margin-top:.35rem;padding:.65rem;width:100%}.cod-disputes__modal textarea{min-height:120px;resize:vertical}.cod-disputes__decision-help{background:#f7fafb;border-radius:8px;color:#52636d;font-size:.9rem;padding:.65rem}.cod-disputes__modal footer{display:flex;gap:.7rem;justify-content:flex-end;margin-top:1rem}.cod-disputes__modal .primary{background:#216275;border:0;border-radius:10px;color:#fff;cursor:pointer;font:inherit;font-weight:800;padding:.65rem .85rem}.cod-disputes__state{padding:2rem;text-align:center}@media(max-width:720px){.cod-disputes{padding:1rem}.cod-disputes__hero{align-items:stretch;border-radius:16px;flex-direction:column;padding:1.15rem}.cod-disputes__hero a{justify-content:center}.cod-dispute-card__top,.cod-dispute-card__message>div{flex-direction:column}.cod-dispute-card__facts{grid-template-columns:repeat(2,minmax(0,1fr))}.cod-dispute-card__message button{width:100%}.cod-disputes__modal{max-height:calc(100dvh - 2rem);overflow:auto}}`}</style>
  </main>;
};

export default CODDisputesPage;
