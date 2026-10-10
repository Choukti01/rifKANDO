import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon, FlagIcon, ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const DECISIONS = ['dismiss', 'warn_seller', 'remove_listing', 'suspend_seller'];

const ProductReportsPage = () => {
  const { i18n, t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [reviewing, setReviewing] = useState(null);
  const [decision, setDecision] = useState('warn_seller');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.get('/admin/product-reports');
      setReports(response.data.reports || []);
    } catch (error) {
      toast.error(error.response?.data?.error || t('moderation.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => reports.reduce((total, report) => ({
    ...total,
    [report.status]: (total[report.status] || 0) + 1,
  }), { pending: 0, resolved: 0, dismissed: 0 }), [reports]);

  const visibleReports = filter === 'all'
    ? reports
    : reports.filter((report) => report.status === filter);

  const openReview = (report, nextDecision = 'warn_seller') => {
    setReviewing(report);
    setDecision(nextDecision);
    setNote('');
  };

  const closeReview = () => {
    if (saving) return;
    setReviewing(null);
    setNote('');
  };

  const resolve = async (event) => {
    event.preventDefault();
    if (!reviewing || !DECISIONS.includes(decision) || note.trim().length < 3) return;

    setSaving(true);
    try {
      await api.patch(`/admin/product-reports/${reviewing.id}`, { decision, note: note.trim() });
      toast.success(t('moderation.saved'));
      setReviewing(null);
      setNote('');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || t('moderation.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value) => new Intl.DateTimeFormat(
    i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-MA' : 'en-MA',
    { dateStyle: 'medium', timeStyle: 'short' },
  ).format(new Date(value));

  const destructiveDecision = decision === 'remove_listing' || decision === 'suspend_seller';

  if (loading) return <div className="admin-reports admin-reports--loading" aria-live="polite"><p>{t('moderation.loading')}</p></div>;

  return (
    <section className="admin-reports" aria-labelledby="moderation-title">
      <header className="admin-reports__hero">
        <div className="admin-reports__hero-icon"><ShieldCheckIcon aria-hidden="true" /></div>
        <div>
          <p className="admin-reports__eyebrow">{t('moderation.eyebrow')}</p>
          <h1 id="moderation-title">{t('moderation.title')}</h1>
          <p>{t('moderation.lead')}</p>
        </div>
      </header>

      <div className="admin-reports__filters" role="tablist" aria-label={t('moderation.filterLabel')}>
        {['pending', 'resolved', 'dismissed', 'all'].map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={filter === status}
            className={filter === status ? 'active' : ''}
            onClick={() => setFilter(status)}
          >
            {t(`moderation.filters.${status}`)} <b>{status === 'all' ? reports.length : counts[status] || 0}</b>
          </button>
        ))}
      </div>

      {visibleReports.length === 0 ? (
        <div className="admin-reports__empty">
          <FlagIcon aria-hidden="true" />
          <h2>{filter === 'pending' ? t('moderation.emptyOpenTitle') : t('moderation.emptyTitle')}</h2>
          <p>{filter === 'pending' ? t('moderation.emptyOpenLead') : t('moderation.emptyLead')}</p>
        </div>
      ) : (
        <div className="admin-reports__list">
          {visibleReports.map((report) => (
            <article key={report.id} className={`admin-report admin-report--${report.status}`}>
              <div className="admin-report__head">
                <div>
                  <p className="admin-report__reason">{t(`productDetails.report.reasons.${report.reason}`)}</p>
                  <h2>{report.product_title}</h2>
                  <p className="admin-report__meta">{t('moderation.reportedBy', { name: report.reporter_name })} · {formatDate(report.created_at)}</p>
                </div>
                <span className="admin-report__status">{t(`moderation.status.${report.status}`)}</span>
              </div>

              <p className="admin-report__details">{report.details}</p>

              <div className="admin-report__context">
                <span>{t('moderation.listingStatus')}: <strong>{report.product_status}</strong></span>
                <Link to={`/product/${report.product_id}`}>{t('moderation.openListing')}</Link>
              </div>

              {report.status === 'pending' ? (
                <div className="admin-report__actions">
                  <button type="button" onClick={() => openReview(report, 'dismiss')}>{t('moderation.decisions.dismiss.label')}</button>
                  <button type="button" onClick={() => openReview(report, 'warn_seller')}>{t('moderation.decisions.warn_seller.label')}</button>
                  <button type="button" className="danger" onClick={() => openReview(report, 'remove_listing')}>{t('moderation.decisions.remove_listing.label')}</button>
                  <button type="button" className="danger danger--strong" onClick={() => openReview(report, 'suspend_seller')}>{t('moderation.decisions.suspend_seller.label')}</button>
                </div>
              ) : (
                <div className="admin-report__resolution">
                  <strong>{t('moderation.resolution')}</strong>
                  <p>{report.resolution_note || t('moderation.noResolution')}</p>
                  {report.reviewer_name && <small>{t('moderation.reviewedBy', { name: report.reviewer_name })}</small>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {reviewing && (
        <div className="moderation-modal-backdrop" role="presentation" onMouseDown={closeReview}>
          <form className="moderation-modal" role="dialog" aria-modal="true" aria-labelledby="moderation-review-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={resolve}>
            <header>
              <div>
                <p>{t('moderation.reviewing')}</p>
                <h2 id="moderation-review-title">{reviewing.product_title}</h2>
              </div>
              <button type="button" className="moderation-modal__close" onClick={closeReview} aria-label={t('moderation.close')} disabled={saving}><XMarkIcon aria-hidden="true" /></button>
            </header>

            <div className="moderation-modal__body">
              <p className="moderation-modal__report"><strong>{t(`productDetails.report.reasons.${reviewing.reason}`)}</strong><span>{reviewing.details}</span></p>
              <label htmlFor="moderation-decision">{t('moderation.decision')}</label>
              <select id="moderation-decision" value={decision} onChange={(event) => setDecision(event.target.value)} disabled={saving}>
                {DECISIONS.map((value) => <option key={value} value={value}>{t(`moderation.decisions.${value}.label`)}</option>)}
              </select>
              <p className={`moderation-modal__decision-copy ${destructiveDecision ? 'is-danger' : ''}`}>
                {destructiveDecision && <ExclamationTriangleIcon aria-hidden="true" />}
                {t(`moderation.decisions.${decision}.description`)}
              </p>
              <label htmlFor="moderation-note">{t('moderation.note')}</label>
              <textarea id="moderation-note" rows="5" maxLength="1000" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('moderation.notePlaceholder')} disabled={saving} required />
              <small>{t('moderation.noteCount', { count: note.trim().length })}</small>
            </div>

            <footer>
              <button type="button" className="moderation-modal__cancel" onClick={closeReview} disabled={saving}>{t('moderation.cancel')}</button>
              <button type="submit" className={destructiveDecision ? 'moderation-modal__submit is-danger' : 'moderation-modal__submit'} disabled={saving || note.trim().length < 3}>
                {saving ? t('moderation.saving') : t('moderation.confirmDecision')}
              </button>
            </footer>
          </form>
        </div>
      )}

      <style>{`
        .admin-reports { max-width: 940px; margin: 0 auto; color: #10233f; }
        .admin-reports--loading { display:grid; min-height:16rem; place-items:center; }
        .admin-reports__hero { display:flex; align-items:flex-start; gap:1rem; padding:1.25rem; border:1px solid #d8e8f3; border-radius:1rem; background:linear-gradient(135deg,#fff,#f4fbff); }
        .admin-reports__hero-icon { display:grid; width:2.7rem; height:2.7rem; flex:0 0 auto; place-items:center; border-radius:.8rem; background:#dff3ff; color:#0b69d6; }
        .admin-reports__hero-icon svg { width:1.45rem; height:1.45rem; }
        .admin-reports__eyebrow,.admin-report__reason,.moderation-modal header p { margin:0; color:#168dd9; font-size:.72rem; font-weight:850; letter-spacing:.1em; text-transform:uppercase; }
        .admin-reports h1 { margin:.2rem 0 .45rem; font-size:clamp(1.55rem,4vw,2.2rem); letter-spacing:-.04em; }
        .admin-reports__hero > div:last-child > p:last-child { max-width:680px; margin:0; color:#607389; line-height:1.55; }
        .admin-reports__filters { display:flex; gap:.55rem; margin-top:1.35rem; overflow-x:auto; padding-bottom:.2rem; scrollbar-width:none; }
        .admin-reports__filters::-webkit-scrollbar { display:none; }
        .admin-reports__filters button { flex:0 0 auto; min-height:40px; border:1px solid #c9d8e4; border-radius:999px; background:#fff; color:#48627b; padding:.45rem .8rem; font:inherit; font-size:.83rem; font-weight:750; cursor:pointer; }
        .admin-reports__filters button.active { border-color:#168dd9; background:#eaf7ff; color:#0757ae; }
        .admin-reports__filters b { margin-inline-start:.22rem; }
        .admin-reports__list { display:grid; gap:1rem; margin-top:1.15rem; }
        .admin-report,.admin-reports__empty { background:#fff; border:1px solid #dbe6ef; border-radius:1rem; padding:1.15rem; }
        .admin-report__head { display:flex; justify-content:space-between; gap:1rem; }
        .admin-report__head h2 { margin:.35rem 0 .15rem; font-size:1.1rem; line-height:1.35; }
        .admin-report__meta { margin:0; color:#66798d; font-size:.82rem; }
        .admin-report__status { height:max-content; flex:0 0 auto; border-radius:999px; background:#fff4d6; color:#9a6100; padding:.32rem .58rem; font-size:.72rem; font-weight:800; text-transform:capitalize; }
        .admin-report--resolved .admin-report__status,.admin-report--dismissed .admin-report__status { background:#eef2f6; color:#526477; }
        .admin-report__details { margin:1rem 0; color:#334e68; line-height:1.6; white-space:pre-wrap; }
        .admin-report__context { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.7rem; padding:.7rem .8rem; border-radius:.7rem; background:#f6f9fc; color:#526477; font-size:.82rem; }
        .admin-report__context strong { color:#29445d; text-transform:capitalize; }
        .admin-report__context a { color:#0b69d6; font-weight:800; text-decoration:none; }
        .admin-report__actions { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:1rem; }
        .admin-report button { min-height:42px; border:1px solid #c9d8e4; border-radius:.6rem; background:#fff; color:#29445d; padding:.55rem .8rem; font:inherit; font-size:.84rem; font-weight:750; cursor:pointer; }
        .admin-report button:hover { border-color:#168dd9; background:#f3faff; }
        .admin-report button.danger { border-color:#b42318; background:#fff7f6; color:#a61b12; }
        .admin-report button.danger--strong { background:#7a271a; color:#fff; }
        .admin-report__resolution { margin-top:1rem; padding:.8rem; border-inline-start:3px solid #a6bdcc; border-radius:.15rem .65rem .65rem .15rem; background:#f7fafc; color:#526477; }
        .admin-report__resolution strong { color:#29445d; font-size:.8rem; }
        .admin-report__resolution p { margin:.35rem 0; line-height:1.55; white-space:pre-wrap; }
        .admin-report__resolution small { color:#78899a; }
        .admin-reports__empty { display:grid; min-height:15rem; place-items:center; text-align:center; }
        .admin-reports__empty svg { width:2.3rem; color:#168dd9; }
        .admin-reports__empty h2 { margin:.65rem 0 .25rem; font-size:1.15rem; }
        .admin-reports__empty p { max-width:28rem; margin:0; color:#607389; }
        .moderation-modal-backdrop { position:fixed; inset:0; z-index:1200; display:grid; place-items:center; padding:1rem; background:rgba(6,22,38,.58); }
        .moderation-modal { width:min(100%,34rem); max-height:min(90dvh,46rem); display:flex; flex-direction:column; overflow:hidden; border:1px solid #d5e3ed; border-radius:1rem; background:#fff; box-shadow:0 24px 70px rgba(6,22,38,.28); }
        .moderation-modal header,.moderation-modal footer { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1.15rem; }
        .moderation-modal header { border-bottom:1px solid #e3edf3; }
        .moderation-modal header h2 { margin:.2rem 0 0; font-size:1.08rem; line-height:1.35; }
        .moderation-modal__close { display:grid; width:42px; height:42px; flex:0 0 auto; place-items:center; border:1px solid #d5e3ed; border-radius:.6rem; background:#fff; color:#465f74; cursor:pointer; }
        .moderation-modal__close svg { width:1.25rem; }
        .moderation-modal__body { display:grid; gap:.65rem; overflow-y:auto; padding:1.15rem; }
        .moderation-modal__body > label { color:#29445d; font-size:.84rem; font-weight:800; }
        .moderation-modal__body select,.moderation-modal__body textarea { width:100%; border:1px solid #bfd2df; border-radius:.65rem; background:#fff; color:#10233f; font:inherit; padding:.72rem; }
        .moderation-modal__body textarea { resize:vertical; }
        .moderation-modal__body small { color:#6b7f92; text-align:end; }
        .moderation-modal__report { display:grid; gap:.35rem; margin:0 0 .25rem; padding:.8rem; border-radius:.7rem; background:#f4f8fb; color:#50677c; font-size:.85rem; line-height:1.55; }
        .moderation-modal__report strong { color:#10233f; }
        .moderation-modal__decision-copy { display:flex; align-items:flex-start; gap:.45rem; margin:.1rem 0 .25rem; color:#526477; font-size:.82rem; line-height:1.45; }
        .moderation-modal__decision-copy.is-danger { color:#9d2619; }
        .moderation-modal__decision-copy svg { width:1rem; flex:0 0 auto; margin-top:.08rem; }
        .moderation-modal footer { border-top:1px solid #e3edf3; }
        .moderation-modal footer button { min-height:44px; border-radius:.65rem; padding:.65rem .9rem; font:inherit; font-weight:800; cursor:pointer; }
        .moderation-modal__cancel { border:1px solid #c9d8e4; background:#fff; color:#526477; }
        .moderation-modal__submit { border:1px solid #10233f; background:#10233f; color:#fff; }
        .moderation-modal__submit.is-danger { border-color:#9d2619; background:#9d2619; }
        .moderation-modal footer button:disabled,.moderation-modal__close:disabled { cursor:not-allowed; opacity:.55; }
        @media(max-width:600px){ .admin-reports__hero{padding:1rem}.admin-report__head{flex-direction:column}.admin-report__status{align-self:flex-start}.admin-report__actions button{flex:1 1 calc(50% - .6rem)}.moderation-modal-backdrop{align-items:end;padding:.65rem}.moderation-modal{max-height:calc(100dvh - 1.3rem)}.moderation-modal footer{align-items:stretch;flex-direction:column-reverse}.moderation-modal footer button{width:100%} }
      `}</style>
    </section>
  );
};

export default ProductReportsPage;
