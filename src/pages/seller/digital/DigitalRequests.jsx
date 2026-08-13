import React, { useCallback, useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { decideDigitalAccessRequest, getDigitalAccessRequests } from '../../../services/api';

const statusLabel = { pending: 'Awaiting review', granted: 'Access granted', declined: 'Declined', completed: 'Access granted' };

const DigitalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await getDigitalAccessRequests();
      setRequests(response.data.requests || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load access requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const decide = async (requestId, action) => {
    const verb = action === 'grant' ? 'grant secure download access to' : 'decline';
    if (!window.confirm(`Are you sure you want to ${verb} this buyer?`)) return;
    setWorkingId(requestId);
    try {
      await decideDigitalAccessRequest(requestId, action);
      toast.success(action === 'grant' ? 'Secure download access granted.' : 'Access request declined.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to update this request.');
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) return <div className="text-center py-8">Loading digital access requests...</div>;

  return (
    <section className="digital-requests-panel">
      <div className="digital-requests-intro"><div><h3>Access requests</h3><p>Grant access only after you have completed your agreed sale or support process. rifKANDO records each decision and delivers the file privately.</p></div></div>
      {requests.length === 0 ? <div className="digital-requests-empty">No buyer access requests yet.</div> : <div className="digital-requests-list">{requests.map((request) => <article key={request.id} className="digital-request-card"><div className="digital-request-copy"><div className="digital-request-heading"><h4>{request.product_title}</h4><span className={`digital-request-status ${request.status}`}>{statusLabel[request.status] || request.status}</span></div><p><strong>{request.buyer_name || 'Buyer'}</strong> requested secure access {request.created_at ? `on ${new Date(request.created_at).toLocaleDateString()}` : ''}.</p>{request.buyer_message && <blockquote>{request.buyer_message}</blockquote>}{request.decision_reason && <p className="digital-decision-note">Decision note: {request.decision_reason}</p>}</div>{request.status === 'pending' && <div className="digital-request-actions"><button type="button" className="digital-decline" disabled={workingId === request.id} onClick={() => decide(request.id, 'decline')}><XMarkIcon /> Decline</button><button type="button" className="digital-grant" disabled={workingId === request.id} onClick={() => decide(request.id, 'grant')}><CheckIcon /> {workingId === request.id ? 'Updating...' : 'Grant access'}</button></div>}</article>)}</div>}
      <style>{`
        .digital-requests-panel { padding: 4px 0; }.digital-requests-intro { padding: 18px 20px; border: 1px solid #dbe9ec; border-radius: 15px; background: #f6fbfc; }.digital-requests-intro h3 { margin: 0; font-size: 1.06rem; color: #1d3c45; }.digital-requests-intro p { max-width: 700px; margin: 7px 0 0; color: #5d747b; font-size: .84rem; line-height: 1.55; }.digital-requests-empty { padding: 34px 16px; text-align: center; color: #61757c; }.digital-requests-list { display: grid; gap: 11px; margin-top: 14px; }.digital-request-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border: 1px solid #e0eaec; border-radius: 14px; background: #fff; }.digital-request-copy { min-width: 0; }.digital-request-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }.digital-request-heading h4 { margin: 0; color: #1d3942; font-size: .96rem; }.digital-request-status { border-radius: 999px; padding: 4px 8px; background: #edf1f2; color: #4f656d; font-size: .7rem; font-weight: 800; }.digital-request-status.pending { background: #e7f4f7; color: #216275; }.digital-request-status.granted, .digital-request-status.completed { background: #e9f7f1; color: #1d7556; }.digital-request-status.declined { background: #f8eeee; color: #934747; }.digital-request-copy p { margin: 6px 0 0; color: #63767c; font-size: .82rem; }.digital-request-copy blockquote { margin: 10px 0 0; padding: 8px 10px; border-left: 3px solid #8ab8c4; color: #45616a; background: #f8fbfc; font-size: .82rem; white-space: pre-line; }.digital-decision-note { font-style: italic; }.digital-request-actions { display: flex; flex: 0 0 auto; gap: 8px; }.digital-request-actions button { display: inline-flex; align-items: center; gap: 5px; border-radius: 9px; padding: 9px 11px; font: inherit; font-size: .8rem; font-weight: 750; cursor: pointer; }.digital-request-actions button:disabled { opacity: .65; cursor: wait; }.digital-request-actions svg { width: 16px; height: 16px; }.digital-grant { border: 1px solid #216275; background: #216275; color: #fff; }.digital-decline { border: 1px solid #d1dcde; background: #fff; color: #5e7278; }@media (max-width: 620px) { .digital-request-card { align-items: stretch; flex-direction: column; }.digital-request-actions button { flex: 1; justify-content: center; } }
      `}</style>
    </section>
  );
};

export default DigitalRequests;
