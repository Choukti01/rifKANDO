import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getMyServiceRequests, reviewServiceOrder, updateServiceOrderStatus } from '../../services/api';
import { ServiceLocalized, useServiceI18n } from '../../i18n/serviceI18n';

const statusLabel = (status) => ({
  requested: 'Waiting for provider', accepted: 'Accepted', in_progress: 'In progress', submitted: 'Work submitted',
  revision_requested: 'Revision requested', completed: 'Completed', declined: 'Declined', cancelled: 'Cancelled',
}[status] || status);

const ServiceRequestsPage = () => {
  const { t, locale } = useServiceI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: '' });

  const load = async () => {
    try {
      const response = await getMyServiceRequests();
      setRequests(response.data.requests || []);
    } catch (error) {
      toast.error(error.response?.data?.error || t('loadRequestsFailed'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [t]);

  const act = async (request, action) => {
    setBusyId(request.id);
    try {
      await updateServiceOrderStatus(request.id, action);
      toast.success(action === 'complete' ? t('projectCompleted') : action === 'request_revision' ? t('revisionSent') : t('projectCancelled'));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || t('actionFailed'));
    } finally { setBusyId(null); }
  };

  const submitReview = async (event, request) => {
    event.preventDefault();
    setBusyId(request.id);
    try {
      await reviewServiceOrder(request.id, Number(review.rating), review.comment);
      toast.success(t('reviewThanks'));
      setReviewing(null);
      setReview({ rating: 5, comment: '' });
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || t('reviewFailed'));
    } finally { setBusyId(null); }
  };

  if (loading) return <ServiceLocalized><div className="service-requests-loading">Loading your service requests...</div></ServiceLocalized>;

  return <ServiceLocalized><section className="service-requests-page">
    <header className="service-requests-hero"><div><p>Client workspace</p><h1>Your service requests</h1><span>Follow each project from request to completion. Online payment is not available yet.</span></div><Link to="/services">Browse services</Link></header>
    {requests.length === 0 ? <div className="service-requests-empty"><ClockIcon aria-hidden="true" /><h2>No service requests yet</h2><p>When you hire a provider, your project updates will appear here.</p><Link to="/services">Explore professionals</Link></div> : <div className="service-requests-list">{requests.map((request) => <article className="service-request-card" key={request.id}>
      <div className="service-request-main"><div className="service-request-top"><div><span className={`service-status service-status--${request.status}`}>{statusLabel(request.status)}</span><h2>{request.service_title}</h2><p>with {request.provider.name}{request.provider.city ? ` · ${request.provider.city}` : ''}</p></div><strong>{request.price.toLocaleString()} MAD</strong></div>
      <dl><div><dt>{t('package')}</dt><dd>{request.package_name}</dd></div><div><dt>{t('requestedOn')}</dt><dd>{new Date(request.created_at).toLocaleDateString(locale)}</dd></div><div><dt>{t('payment')}</dt><dd>{t('onlinePaymentSoon')}</dd></div></dl><div className="service-requirements"><span>{t('yourBrief')}</span><p>{request.requirements}</p></div>
      {request.provider_note && <div className="service-note"><span>Provider update</span><p>{request.provider_note}</p></div>}
      {request.buyer_note && <div className="service-note"><span>Your latest update</span><p>{request.buyer_note}</p></div>}
      <div className="service-request-actions">
        {!['declined', 'cancelled'].includes(request.status) && <Link to={`/service-workroom/${request.id}`} className="service-workroom-link">Open project workspace</Link>}
        {request.status === 'requested' && <button disabled={busyId === request.id} onClick={() => act(request, 'cancel')} className="soft">Cancel request</button>}
        {request.status === 'accepted' && <button disabled={busyId === request.id} onClick={() => act(request, 'cancel')} className="soft">Cancel request</button>}
        {request.status === 'submitted' && <><button disabled={busyId === request.id} onClick={() => act(request, 'request_revision')} className="soft">Request revision</button><button disabled={busyId === request.id} onClick={() => act(request, 'complete')} className="primary"><CheckCircleIcon aria-hidden="true" />Accept & complete</button></>}
        {request.status === 'completed' && !request.review && <button onClick={() => setReviewing(request.id)} className="primary"><StarIcon aria-hidden="true" />Leave a review</button>}
      </div>
      {request.review && <div className="service-review-complete"><StarIcon aria-hidden="true" /><span>Your {request.review.rating}/5 review is published.</span></div>}
      {reviewing === request.id && <form onSubmit={(event) => submitReview(event, request)} className="service-review-form"><label>Rating<select value={review.rating} onChange={(event) => setReview((current) => ({ ...current, rating: event.target.value }))}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label><label>Review<textarea value={review.comment} onChange={(event) => setReview((current) => ({ ...current, comment: event.target.value }))} maxLength="2000" placeholder="Share an honest, useful review." /></label><div><button type="button" onClick={() => setReviewing(null)}>Cancel</button><button disabled={busyId === request.id} type="submit">Publish review</button></div></form>}
      </div>
    </article>)}</div>}
    <style>{`
      .service-requests-page{width:min(1080px,calc(100% - 2rem));margin:0 auto;padding:2rem 0 4rem;color:#173b59}.service-requests-hero{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:clamp(1.2rem,4vw,2.4rem);border:1px solid rgba(23,114,184,.16);border-radius:24px;background:linear-gradient(135deg,#eaf7ff,#fff);box-shadow:0 14px 30px rgba(20,74,116,.07)}.service-requests-hero p{margin:0;color:#197abc;font-size:.72rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.service-requests-hero h1{margin:.28rem 0;color:#123b5c;font-size:clamp(1.45rem,3vw,2.2rem);letter-spacing:-.04em}.service-requests-hero span{color:#59778e;line-height:1.5}.service-requests-hero>a,.service-requests-empty>a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:.65rem .85rem;border-radius:12px;background:#1472b3;color:#fff;font-size:.82rem;font-weight:800;text-decoration:none;white-space:nowrap}.service-requests-list{display:grid;gap:1rem;margin-top:1rem}.service-request-card{border:1px solid rgba(23,114,184,.13);border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 9px 20px rgba(20,74,116,.05)}.service-request-main{padding:clamp(1rem,3vw,1.4rem)}.service-request-top{display:flex;justify-content:space-between;gap:1rem}.service-request-top h2{margin:.48rem 0 .18rem;font-size:1.06rem;color:#173b59}.service-request-top p{margin:0;color:#668399;font-size:.83rem}.service-request-top>strong{color:#0968a8;font-size:1rem;white-space:nowrap}.service-status{display:inline-flex;padding:.26rem .5rem;border-radius:99px;font-size:.68rem;font-weight:850}.service-status--requested{background:#fff4d9;color:#9a6504}.service-status--accepted,.service-status--in_progress,.service-status--revision_requested{background:#e6f5ff;color:#0870ae}.service-status--submitted{background:#eee9ff;color:#5942a2}.service-status--completed{background:#e5f8ed;color:#157447}.service-status--declined,.service-status--cancelled{background:#fff0f0;color:#a34343}.service-request-main dl{display:grid;grid-template-columns:repeat(3,1fr);gap:.65rem;margin:1rem 0}.service-request-main dl div{padding:.65rem;border-radius:11px;background:#f5faff}.service-request-main dt{color:#718c9f;font-size:.67rem;font-weight:750;text-transform:uppercase;letter-spacing:.05em}.service-request-main dd{margin:.24rem 0 0;color:#315a77;font-size:.8rem;font-weight:750}.service-requirements,.service-note{padding:.75rem .85rem;border-radius:12px;background:#fbfdff;border:1px solid #e3edf4}.service-requirements>span,.service-note>span{color:#447291;font-size:.7rem;font-weight:850;text-transform:uppercase;letter-spacing:.05em}.service-requirements p,.service-note p{margin:.3rem 0 0;color:#42647c;line-height:1.5;font-size:.86rem;white-space:pre-wrap}.service-note{margin-top:.6rem;background:#f0f9ff}.service-request-actions{display:flex;justify-content:flex-end;gap:.55rem;flex-wrap:wrap;margin-top:1rem}.service-request-actions button,.service-request-actions .service-workroom-link,.service-review-form button{min-height:39px;border-radius:11px;padding:.55rem .75rem;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}.service-request-actions .service-workroom-link{display:inline-flex;align-items:center;justify-content:center;border:1px solid #b8dceb;background:#f5fbff;color:#126ea9;text-decoration:none}.service-request-actions .primary,.service-review-form button[type=submit]{display:inline-flex;align-items:center;gap:.35rem;color:#fff;border:1px solid #1370ad;background:#1478bb}.service-request-actions .primary svg{width:1rem;height:1rem}.service-request-actions .soft,.service-review-form button[type=button]{color:#476a82;border:1px solid #d1e1eb;background:#fff}.service-request-actions button:disabled,.service-review-form button:disabled{opacity:.55;cursor:wait}.service-review-complete{display:flex;align-items:center;gap:.4rem;margin-top:1rem;color:#1a7547;font-size:.8rem;font-weight:750}.service-review-complete svg{width:1rem;height:1rem;fill:#ffd866;color:#d59810}.service-review-form{display:grid;gap:.75rem;margin-top:1rem;padding:1rem;border:1px solid #cfe5f3;border-radius:14px;background:#f5fbff}.service-review-form label{display:grid;gap:.35rem;color:#315a77;font-size:.8rem;font-weight:800}.service-review-form select,.service-review-form textarea{border:1px solid #cbdfe9;border-radius:10px;padding:.65rem;font:inherit;color:#1e4867}.service-review-form textarea{min-height:74px;resize:vertical}.service-review-form>div{display:flex;justify-content:flex-end;gap:.5rem}.service-requests-empty{margin-top:1rem;padding:3rem 1rem;text-align:center;border:1px dashed #b8d6e8;border-radius:20px;background:#fbfdff}.service-requests-empty svg{width:2rem;height:2rem;color:#3d93cc}.service-requests-empty h2{margin:.75rem 0 .3rem;color:#214968;font-size:1.1rem}.service-requests-empty p{margin:0 0 1rem;color:#6b879c;font-size:.88rem}@media(max-width:640px){.service-requests-page{width:min(100% - 1rem,1080px);padding-top:1rem}.service-requests-hero{align-items:flex-start;flex-direction:column}.service-request-main dl{grid-template-columns:1fr}.service-request-top{flex-direction:column}.service-request-top>strong{order:-1}.service-request-actions>*{flex:1}.service-request-actions button{justify-content:center}.service-review-form>div>*{flex:1}}
    `}</style>
  </section></ServiceLocalized>;
};

export default ServiceRequestsPage;
