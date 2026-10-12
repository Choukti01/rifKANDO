import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, BoltIcon, ChartBarSquareIcon, ClockIcon, CodeBracketSquareIcon, ExclamationTriangleIcon, ServerStackIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

const WINDOWS = [
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 7 days', hours: 168 },
  { label: 'Last 30 days', hours: 720 },
];

const dateTime = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unknown time' : parsed.toLocaleString();
};

const ErrorTrackingPage = () => {
  const [hours, setHours] = useState(24);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get('/admin/error-tracking', { params: { hours, limit: 100 } });
      setReport(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load rifKANDO Error Tracking.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hours]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const cards = useMemo(() => [
    { label: 'Recorded errors', value: report?.summary?.errors || 0, icon: ExclamationTriangleIcon, tone: 'danger' },
    { label: 'Backend failures', value: report?.summary?.backend || 0, icon: ServerStackIcon, tone: 'ink' },
    { label: 'Browser crashes', value: report?.summary?.frontend || 0, icon: CodeBracketSquareIcon, tone: 'blue' },
    { label: 'Warnings', value: report?.summary?.warnings || 0, icon: BoltIcon, tone: 'gold' },
  ], [report]);

  if (loading) return <main className="error-tracking"><div className="error-tracking__state">Loading rifKANDO Error Tracking...</div></main>;

  return (
    <main className="error-tracking">
      <header className="error-tracking__hero">
        <div>
          <span><ShieldCheckIcon aria-hidden="true" />Owner-only operations</span>
          <h1>rifKANDO Error Tracking</h1>
          <p>A private operational view of unexpected marketplace failures. Events are grouped, request-correlated, and redacted before storage. It never records passwords, tokens, bank details, addresses, or chat content.</p>
        </div>
        <button type="button" onClick={() => void load({ quiet: true })} disabled={refreshing}><ArrowPathIcon className={refreshing ? 'is-spinning' : ''} aria-hidden="true" />{refreshing ? 'Refreshing...' : 'Refresh signals'}</button>
      </header>

      <section className="error-tracking__controls" aria-label="Error tracking time range">
        <div className="error-tracking__windows">{WINDOWS.map((window) => <button key={window.hours} type="button" className={hours === window.hours ? 'is-active' : ''} onClick={() => setHours(window.hours)}>{window.label}</button>)}</div>
        <p><ClockIcon aria-hidden="true" />Showing events since {report?.since ? dateTime(report.since) : 'now'}</p>
      </section>

      <section className="error-tracking__stats" aria-label="Error summary">
        {cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className={`error-tracking__stat error-tracking__stat--${tone}`}><Icon aria-hidden="true" /><div><span>{label}</span><strong>{value.toLocaleString()}</strong></div></article>)}
      </section>

      <section className="error-tracking__notice"><ChartBarSquareIcon aria-hidden="true" /><p><strong>How to read this desk:</strong> one fingerprint represents a recurring technical issue. Start with the highest occurrence count, use the route and request ID to reproduce it, then verify the fix with the normal test suite. A zero-error period is a healthy signal, not missing data.</p></section>

      <section className="error-tracking__panel">
        <div className="error-tracking__panel-heading"><div><span>Priority queue</span><h2>Recurring issues</h2></div><p>Grouped by safe error fingerprint</p></div>
        {!report?.fingerprints?.length ? <div className="error-tracking__empty"><ShieldCheckIcon aria-hidden="true" /><h3>No unexpected failures in this period</h3><p>rifKANDO is not currently receiving tracked browser crashes or backend 5xx responses.</p></div> : <div className="error-tracking__fingerprints">{report.fingerprints.map((item) => <article key={item.fingerprint} className="error-tracking__fingerprint"><div className="error-tracking__fingerprint-top"><span className={`error-tracking__source error-tracking__source--${item.source}`}>{item.source}</span><strong>{Number(item.occurrences || 0).toLocaleString()} occurrence{Number(item.occurrences) === 1 ? '' : 's'}</strong></div><h3>{item.error_name}</h3><p>{item.message}</p><dl><div><dt>Route</dt><dd>{item.method ? `${item.method} ` : ''}{item.route}</dd></div><div><dt>Status</dt><dd>{item.status_code || 'Browser event'}</dd></div><div><dt>Last seen</dt><dd>{dateTime(item.last_seen)}</dd></div></dl></article>)}</div>}
      </section>

      <section className="error-tracking__panel">
        <div className="error-tracking__panel-heading"><div><span>Event trail</span><h2>Latest recorded signals</h2></div><p>Request IDs help connect an event to safe backend logs.</p></div>
        {!report?.events?.length ? <p className="error-tracking__empty-line">No recorded errors in this period.</p> : <div className="error-tracking__events" role="table" aria-label="Latest recorded errors"><div className="error-tracking__events-head" role="row"><span>When</span><span>Source</span><span>Issue</span><span>Route</span><span>Trace</span></div>{report.events.map((item) => <article key={item.id} role="row"><time role="cell" dateTime={item.occurred_at}>{dateTime(item.occurred_at)}</time><span role="cell" className={`error-tracking__source error-tracking__source--${item.source}`}>{item.source}</span><div role="cell"><strong>{item.error_name}</strong><p>{item.message}</p></div><code role="cell">{item.method ? `${item.method} ` : ''}{item.route}</code><code role="cell">{item.request_id || 'Browser event'}</code></article>)}</div>}
      </section>

      <style>{`.error-tracking{margin:0 auto;max-width:1200px;padding:1.25rem}.error-tracking__hero{align-items:flex-start;background:linear-gradient(135deg,#0A1B35,#0d406b 58%,#0877BF);border-radius:22px;color:#fff;display:flex;gap:1.5rem;justify-content:space-between;padding:1.55rem}.error-tracking__hero>div{max-width:760px}.error-tracking__hero span{align-items:center;color:#b8e1ff;display:flex;font-size:.73rem;font-weight:850;gap:.38rem;letter-spacing:.1em;text-transform:uppercase}.error-tracking__hero span svg{height:1rem;width:1rem}.error-tracking__hero h1{font-size:clamp(1.55rem,4vw,2.1rem);margin:.38rem 0 .55rem}.error-tracking__hero p{color:#e0f2ff;line-height:1.58;margin:0}.error-tracking__hero button{align-items:center;background:#fff;border:0;border-radius:.72rem;color:#0A1B35;cursor:pointer;display:inline-flex;flex:0 0 auto;font:inherit;font-size:.82rem;font-weight:850;gap:.45rem;padding:.72rem .85rem}.error-tracking__hero button:disabled{cursor:wait;opacity:.72}.error-tracking__hero button svg{height:1rem;width:1rem}.is-spinning{animation:error-tracking-spin 850ms linear infinite}@keyframes error-tracking-spin{to{transform:rotate(360deg)}}.error-tracking__controls{align-items:center;display:flex;flex-wrap:wrap;gap:.8rem;justify-content:space-between;margin:1rem 0}.error-tracking__windows{display:flex;flex-wrap:wrap;gap:.42rem}.error-tracking__windows button{background:#fff;border:1px solid #d9e5ee;border-radius:999px;color:#4a6175;cursor:pointer;font:inherit;font-size:.76rem;font-weight:800;padding:.48rem .7rem}.error-tracking__windows button.is-active{background:#e5f5ff;border-color:#63B8F3;color:#0877BF}.error-tracking__controls p{align-items:center;color:#607588;display:flex;font-size:.75rem;gap:.35rem;margin:0}.error-tracking__controls p svg{height:1rem;width:1rem}.error-tracking__stats{display:grid;gap:.8rem;grid-template-columns:repeat(4,minmax(0,1fr))}.error-tracking__stat{align-items:center;background:#fff;border:1px solid #e2eaf0;border-radius:16px;display:flex;gap:.7rem;padding:1rem}.error-tracking__stat>svg{border-radius:.7rem;height:1.25rem;padding:.58rem;width:1.25rem}.error-tracking__stat span{color:#687b8c;display:block;font-size:.72rem;font-weight:750}.error-tracking__stat strong{color:#102a43;font-size:1.45rem}.error-tracking__stat--danger>svg{background:#fff0ef;color:#b42318}.error-tracking__stat--ink>svg{background:#edf4fa;color:#0A1B35}.error-tracking__stat--blue>svg{background:#e4f5ff;color:#0877BF}.error-tracking__stat--gold>svg{background:#fff7df;color:#956800}.error-tracking__notice{align-items:flex-start;background:#f1f9ff;border:1px solid #d3ebfb;border-radius:14px;color:#38556b;display:flex;gap:.6rem;line-height:1.55;margin:1rem 0;padding:.85rem 1rem}.error-tracking__notice svg{color:#0877BF;flex:0 0 auto;height:1.1rem;margin-top:.15rem;width:1.1rem}.error-tracking__notice p{font-size:.8rem;margin:0}.error-tracking__panel{background:#fff;border:1px solid #e1eaf0;border-radius:18px;margin-top:1rem;overflow:hidden}.error-tracking__panel-heading{align-items:flex-end;border-bottom:1px solid #edf2f5;display:flex;gap:1rem;justify-content:space-between;padding:1rem 1.1rem}.error-tracking__panel-heading span{color:#0877BF;font-size:.7rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.error-tracking__panel-heading h2{color:#102a43;font-size:1.08rem;margin:.2rem 0 0}.error-tracking__panel-heading p{color:#738394;font-size:.73rem;margin:0}.error-tracking__fingerprints{display:grid;gap:.7rem;grid-template-columns:repeat(2,minmax(0,1fr));padding:1rem}.error-tracking__fingerprint{border:1px solid #e2eaf0;border-radius:14px;padding:.9rem}.error-tracking__fingerprint-top{align-items:center;display:flex;justify-content:space-between}.error-tracking__fingerprint-top strong{color:#40566b;font-size:.73rem}.error-tracking__source{border-radius:999px;display:inline-block;font-size:.66rem;font-weight:850;letter-spacing:.05em;padding:.28rem .45rem;text-transform:uppercase}.error-tracking__source--backend{background:#edf2f7;color:#294760}.error-tracking__source--frontend{background:#e3f5ff;color:#0877BF}.error-tracking__fingerprint h3{color:#142f47;font-size:.92rem;margin:.7rem 0 .28rem}.error-tracking__fingerprint p{color:#5d7183;font-size:.78rem;line-height:1.45;margin:0;overflow-wrap:anywhere}.error-tracking__fingerprint dl{display:grid;gap:.5rem;grid-template-columns:repeat(3,minmax(0,1fr));margin:.8rem 0 0}.error-tracking__fingerprint dt{color:#8392a0;font-size:.64rem;font-weight:800;text-transform:uppercase}.error-tracking__fingerprint dd{color:#3f5669;font-size:.7rem;margin:.16rem 0 0;overflow-wrap:anywhere}.error-tracking__events{overflow-x:auto}.error-tracking__events>article,.error-tracking__events-head{align-items:center;display:grid;gap:.85rem;grid-template-columns:9rem 5.5rem minmax(16rem,1.8fr) minmax(9rem,1fr) minmax(9rem,1fr);min-width:820px;padding:.78rem 1.1rem}.error-tracking__events-head{background:#f7fafc;color:#778898;font-size:.67rem;font-weight:850;letter-spacing:.06em;text-transform:uppercase}.error-tracking__events>article{border-top:1px solid #edf2f5}.error-tracking__events time,.error-tracking__events code{color:#526a7d;font-size:.7rem;overflow-wrap:anywhere}.error-tracking__events strong{color:#16334c;font-size:.78rem}.error-tracking__events p{color:#5e7385;font-size:.72rem;line-height:1.38;margin:.2rem 0 0;overflow-wrap:anywhere}.error-tracking__empty{color:#5c7080;padding:2.2rem 1rem;text-align:center}.error-tracking__empty svg{color:#0877BF;height:2rem;width:2rem}.error-tracking__empty h3{color:#193750;margin:.55rem 0 .25rem}.error-tracking__empty p,.error-tracking__empty-line{color:#64798a;font-size:.82rem;margin:.25rem auto;max-width:36rem}.error-tracking__empty-line{padding:1.5rem}.error-tracking__state{padding:3rem;text-align:center}@media(max-width:850px){.error-tracking__stats{grid-template-columns:repeat(2,minmax(0,1fr))}.error-tracking__fingerprints{grid-template-columns:1fr}.error-tracking__hero{flex-direction:column}.error-tracking__hero button{justify-content:center;width:100%}}@media(max-width:520px){.error-tracking{padding:1rem}.error-tracking__hero{border-radius:18px;padding:1.2rem}.error-tracking__stats{grid-template-columns:1fr}.error-tracking__controls{align-items:flex-start;flex-direction:column}.error-tracking__panel-heading{align-items:flex-start;flex-direction:column}.error-tracking__fingerprint dl{grid-template-columns:1fr 1fr}.error-tracking__fingerprint dl div:last-child{grid-column:1/-1}}`}</style>
    </main>
  );
};

export default ErrorTrackingPage;
