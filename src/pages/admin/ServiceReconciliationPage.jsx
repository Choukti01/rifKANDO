import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, BanknotesIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getServiceReconciliation, recordServiceProviderPayout, verifyServiceTransfer } from '../../services/api';

const money = (value) => `${Number(value || 0).toLocaleString('en-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
const label = (value) => String(value || 'not_due').replaceAll('_', ' ');

const ServiceReconciliationPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notes, setNotes] = useState({});
  const [payouts, setPayouts] = useState({});

  const load = useCallback(async () => {
    try {
      const response = await getServiceReconciliation();
      setTransfers(response.data.transfers || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load Services Reconciliation.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => transfers.reduce((summary, transfer) => ({
    awaiting: summary.awaiting + (transfer.payment_status === 'submitted' ? 1 : 0),
    held: summary.held + (transfer.payment_status === 'verified' && transfer.payout_status !== 'paid' ? Number(transfer.amount || 0) : 0),
    due: summary.due + (transfer.payout_status === 'due' ? Number(transfer.provider_payout || 0) : 0),
  }), { awaiting: 0, held: 0, due: 0 }), [transfers]);

  const verify = async (transfer, action) => {
    setBusy(`${action}-${transfer.id}`);
    try {
      await verifyServiceTransfer(transfer.id, action, notes[transfer.id] || '');
      toast.success(action === 'verify' ? 'Transfer verified. The provider can begin work.' : 'Transfer rejected for correction.');
      await load();
    } catch (error) { toast.error(error.response?.data?.error || 'This payment record could not be updated.'); }
    finally { setBusy(null); }
  };

  const recordPayout = async (transfer) => {
    const form = payouts[transfer.id] || {};
    if (!String(form.reference || '').trim()) return toast.error('Enter the real seller payout reference first.');
    setBusy(`payout-${transfer.id}`);
    try {
      await recordServiceProviderPayout(transfer.id, form.reference, form.note || '');
      toast.success('Seller payout recorded.');
      await load();
    } catch (error) { toast.error(error.response?.data?.error || 'The seller payout could not be recorded.'); }
    finally { setBusy(null); }
  };

  if (loading) return <main className="service-reconciliation"><div className="service-reconciliation__state">Loading Services Reconciliation…</div></main>;

  return <main className="service-reconciliation">
    <header className="service-reconciliation__hero">
      <div><span><BanknotesIcon aria-hidden="true" />Founder-only financial control</span><h1>Services Reconciliation</h1><p>Verify real incoming bank transfers, release providers only after client completion, and retain an auditable settlement trail. This page never moves money automatically.</p></div>
      <button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading}><ArrowPathIcon aria-hidden="true" />Refresh</button>
    </header>
    <aside className="service-reconciliation__notice"><ExclamationTriangleIcon aria-hidden="true" /><p>Verify each transfer directly in the rifKANDO bank account before approving it. A buyer reference or screenshot is evidence only, never proof of payment.</p></aside>
    <section className="service-reconciliation__stats" aria-label="Service payment totals"><article><span>Awaiting verification</span><strong>{totals.awaiting}</strong></article><article><span>Verified funds held</span><strong>{money(totals.held)}</strong></article><article><span>Provider payouts due</span><strong>{money(totals.due)}</strong></article></section>
    {transfers.length === 0 ? <section className="service-reconciliation__empty"><ClipboardDocumentCheckIcon aria-hidden="true" /><h2>No service transfers yet</h2><p>Bank-transfer records appear here after an accepted client request opens payment instructions.</p></section> : <section className="service-reconciliation__list">{transfers.map((transfer) => <article className="service-transfer" key={transfer.id}>
      <header><div><span className={`service-transfer__status service-transfer__status--${transfer.payment_status}`}>{label(transfer.payment_status)}</span><h2>{transfer.service_title}</h2><p>#{transfer.order_number} · {transfer.buyer_name} → {transfer.provider_name}</p></div><strong>{money(transfer.amount)}</strong></header>
      <dl><div><dt>Client pays</dt><dd>{money(transfer.amount)}</dd></div><div><dt>rifKANDO 5%</dt><dd>{money(transfer.commission)}</dd></div><div><dt>Provider receives</dt><dd>{money(transfer.provider_payout)}</dd></div><div><dt>Project</dt><dd>{label(transfer.service_status)}</dd></div><div><dt>Payout</dt><dd>{label(transfer.payout_status)}</dd></div><div><dt>Transfer reference</dt><dd>{transfer.transfer_reference || 'Not submitted'}</dd></div></dl>
      {transfer.buyer_note && <p className="service-transfer__note"><b>Client note:</b> {transfer.buyer_note}</p>}
      {transfer.verification_note && <p className="service-transfer__note"><b>Verification note:</b> {transfer.verification_note}</p>}
      {transfer.payment_status === 'submitted' && <div className="service-transfer__actions"><label>Internal verification note<textarea value={notes[transfer.id] || ''} maxLength="1000" onChange={(event) => setNotes((current) => ({ ...current, [transfer.id]: event.target.value }))} placeholder="Example: matched against Attijari transfer on 15 Oct." /></label><div><button type="button" className="quiet" disabled={busy === `reject-${transfer.id}`} onClick={() => { void verify(transfer, 'reject'); }}>Reject for correction</button><button type="button" className="primary" disabled={busy === `verify-${transfer.id}`} onClick={() => { void verify(transfer, 'verify'); }}><CheckCircleIcon aria-hidden="true" />Verify bank transfer</button></div></div>}
      {transfer.payment_status === 'verified' && transfer.payout_status === 'due' && <div className="service-transfer__actions"><label>Seller payout reference<input value={payouts[transfer.id]?.reference || ''} maxLength="256" onChange={(event) => setPayouts((current) => ({ ...current, [transfer.id]: { ...current[transfer.id], reference: event.target.value } }))} placeholder="Bank transfer or cash receipt reference" /></label><label>Internal payout note <input value={payouts[transfer.id]?.note || ''} maxLength="1000" onChange={(event) => setPayouts((current) => ({ ...current, [transfer.id]: { ...current[transfer.id], note: event.target.value } }))} placeholder="Optional" /></label><button type="button" className="primary" disabled={busy === `payout-${transfer.id}`} onClick={() => { void recordPayout(transfer); }}>Record seller payout</button></div>}
      {transfer.payout_status === 'paid' && <p className="service-transfer__complete"><CheckCircleIcon aria-hidden="true" />Seller payout recorded: {transfer.payout_reference}</p>}
    </article>)}</section>}
    <style>{`
      .service-reconciliation{width:min(1160px,calc(100% - 2rem));margin:0 auto;padding:2rem 0 4rem;color:#173d5c}.service-reconciliation__hero{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;padding:clamp(1.2rem,4vw,2.4rem);border-radius:24px;border:1px solid rgba(25,115,184,.18);background:linear-gradient(135deg,#e8f7ff,#fff);box-shadow:0 16px 34px rgba(10,74,120,.08)}.service-reconciliation__hero span{display:flex;align-items:center;gap:.4rem;color:#0875b8;font-size:.73rem;font-weight:850;letter-spacing:.05em;text-transform:uppercase}.service-reconciliation__hero span svg{width:1rem}.service-reconciliation__hero h1{margin:.45rem 0;color:#123b5c;font-size:clamp(1.55rem,4vw,2.45rem);letter-spacing:-.045em}.service-reconciliation__hero p{max-width:730px;margin:0;color:#55768e;line-height:1.55}.service-reconciliation__hero button{display:inline-flex;align-items:center;gap:.4rem;min-height:42px;padding:.55rem .8rem;border:1px solid #a8d3ea;border-radius:12px;background:#fff;color:#126da7;font:inherit;font-size:.8rem;font-weight:850;cursor:pointer}.service-reconciliation__hero button svg{width:1rem}.service-reconciliation__notice{display:flex;align-items:flex-start;gap:.65rem;margin:1rem 0;padding:.85rem 1rem;border:1px solid #f1d89a;border-radius:14px;background:#fffaf0;color:#745616}.service-reconciliation__notice svg{flex:none;width:1.2rem;margin-top:.1rem}.service-reconciliation__notice p{margin:0;line-height:1.5;font-size:.86rem}.service-reconciliation__stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-bottom:1rem}.service-reconciliation__stats article{padding:1rem;border:1px solid #dcecf5;border-radius:16px;background:rgba(255,255,255,.8)}.service-reconciliation__stats span{display:block;color:#6b8799;font-size:.73rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.service-reconciliation__stats strong{display:block;margin-top:.4rem;color:#126fa9;font-size:1.25rem}.service-reconciliation__empty{padding:3rem 1rem;border:1px dashed #b5d6e7;border-radius:20px;text-align:center;background:#fbfdff}.service-reconciliation__empty svg{width:2.2rem;color:#2181bd}.service-reconciliation__empty h2{margin:.7rem 0 .25rem;font-size:1.1rem}.service-reconciliation__empty p{margin:0;color:#6c8799}.service-reconciliation__list{display:grid;gap:1rem}.service-transfer{padding:1.15rem;border:1px solid #d7e8f1;border-radius:19px;background:rgba(255,255,255,.92);box-shadow:0 8px 22px rgba(13,70,108,.045)}.service-transfer>header{display:flex;justify-content:space-between;gap:1rem}.service-transfer h2{margin:.45rem 0 .15rem;font-size:1.05rem}.service-transfer header p{margin:0;color:#66849a;font-size:.84rem}.service-transfer>header>strong{color:#096da9;white-space:nowrap}.service-transfer__status{display:inline-flex;padding:.25rem .5rem;border-radius:99px;font-size:.67rem;font-weight:850;text-transform:capitalize}.service-transfer__status--submitted{background:#fff3d8;color:#956407}.service-transfer__status--verified{background:#e5f5ff;color:#0870ad}.service-transfer__status--rejected{background:#fff0f0;color:#a14545}.service-transfer__status--awaiting_payment{background:#f0f4f7;color:#617685}.service-transfer dl{display:grid;grid-template-columns:repeat(6,1fr);gap:.55rem;margin:1rem 0}.service-transfer dl div{padding:.65rem;border-radius:10px;background:#f6fbfe}.service-transfer dt{color:#708b9e;font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.035em}.service-transfer dd{margin:.25rem 0 0;color:#315a77;font-size:.78rem;font-weight:800;overflow-wrap:anywhere}.service-transfer__note{margin:.55rem 0;padding:.65rem .75rem;border-left:3px solid #9bd2ed;background:#f7fbfd;color:#4d6f86;font-size:.83rem;white-space:pre-wrap}.service-transfer__actions{display:grid;gap:.65rem;margin-top:1rem;padding-top:1rem;border-top:1px solid #e4eef4}.service-transfer__actions label{display:grid;gap:.35rem;color:#42687f;font-size:.77rem;font-weight:800}.service-transfer__actions textarea,.service-transfer__actions input{width:100%;box-sizing:border-box;border:1px solid #c7dce8;border-radius:10px;padding:.65rem;font:inherit;color:#244f6d;background:#fff}.service-transfer__actions textarea{min-height:68px;resize:vertical}.service-transfer__actions>div{display:flex;justify-content:flex-end;gap:.55rem}.service-transfer__actions button{min-height:39px;padding:.52rem .74rem;border-radius:10px;font:inherit;font-size:.77rem;font-weight:850;cursor:pointer}.service-transfer__actions .quiet{border:1px solid #d9b6b6;background:#fff;color:#a04242}.service-transfer__actions .primary{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #1071af;background:#147bbb;color:#fff}.service-transfer__actions .primary svg{width:1rem}.service-transfer__complete{display:flex;align-items:center;gap:.35rem;margin:1rem 0 0;color:#187847;font-size:.82rem;font-weight:800}.service-transfer__complete svg{width:1rem}@media(max-width:760px){.service-reconciliation{width:min(100% - 1rem,1160px);padding-top:1rem}.service-reconciliation__hero{flex-direction:column}.service-reconciliation__stats{grid-template-columns:1fr}.service-transfer>header{flex-direction:column}.service-transfer dl{grid-template-columns:repeat(2,1fr)}.service-transfer__actions>div{justify-content:stretch}.service-transfer__actions>div button{flex:1}}`}</style>
  </main>;
};

export default ServiceReconciliationPage;
