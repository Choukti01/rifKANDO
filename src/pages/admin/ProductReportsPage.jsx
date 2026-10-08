import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ProductReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [filter, setFilter] = useState('pending');

  const load = async () => {
    try {
      const response = await api.get('/admin/product-reports');
      setReports(response.data.reports || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load listing reports.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const resolve = async (report, decision) => {
    const prompts = {
      dismiss: 'Why is this report being dismissed?',
      warn_seller: 'What should the seller correct?',
      remove_listing: 'Why is this listing being removed from sale?',
      suspend_seller: 'Why is this seller being suspended? This removes all active listings and signs the seller out.',
    };
    if (decision === 'suspend_seller' && !window.confirm('Suspend this seller? All active listings will be removed and the seller will be signed out.')) return;
    const note = window.prompt(prompts[decision]);
    if (!note) return;
    setSaving(report.id);
    try {
      await api.patch(`/admin/product-reports/${report.id}`, { decision, note });
      const messages = {
        dismiss: 'Report dismissed.',
        warn_seller: 'Seller warned.',
        remove_listing: 'Listing removed from sale.',
        suspend_seller: 'Seller suspended and active listings removed.',
      };
      toast.success(messages[decision]);
      await load();
    } catch (error) { toast.error(error.response?.data?.error || 'Unable to save moderation decision.'); }
    finally { setSaving(null); }
  };

  const visibleReports = filter === 'all' ? reports : reports.filter((report) => report.status === filter);
  const pendingCount = reports.filter((report) => report.status === 'pending').length;

  if (loading) return <div className="admin-reports"><p>Loading moderation queue…</p></div>;
  return <section className="admin-reports"><header><span>Trust & safety</span><h1>Listing reports</h1><p>Review buyer reports privately. Warnings leave a record, removing a listing prevents new sales, and suspension is reserved for serious or repeated abuse.</p></header>
    <div className="admin-reports__filters" role="tablist" aria-label="Report status"><button type="button" className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Open <b>{pendingCount}</b></button><button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All reports</button></div>
    {visibleReports.length === 0 ? <div className="admin-reports__empty">{filter === 'pending' ? 'No open listing reports.' : 'No listing reports yet.'}</div> : <div className="admin-reports__list">{visibleReports.map((report) => <article key={report.id} className={`admin-report admin-report--${report.status}`}><div className="admin-report__head"><div><strong>{report.product_title}</strong><p>{report.reason.replace('_', ' ')} · reported {new Date(report.created_at).toLocaleString()}</p></div><span>{report.status}</span></div><p className="admin-report__details">{report.details}</p>{report.status === 'pending' ? <div className="admin-report__actions"><button type="button" onClick={() => resolve(report, 'dismiss')} disabled={saving === report.id}>Dismiss</button><button type="button" onClick={() => resolve(report, 'warn_seller')} disabled={saving === report.id}>Warn seller</button><button type="button" className="danger" onClick={() => resolve(report, 'remove_listing')} disabled={saving === report.id}>{saving === report.id ? 'Saving…' : 'Remove listing'}</button><button type="button" className="danger danger--strong" onClick={() => resolve(report, 'suspend_seller')} disabled={saving === report.id}>Suspend seller</button></div> : <p className="admin-report__resolution">Decision: {report.resolution_note || 'No note recorded.'}</p>}</article>)}</div>}
    <style>{`.admin-reports{max-width:920px;margin:0 auto;color:#10233f}.admin-reports header>span{color:#168dd9;font-size:.78rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.admin-reports h1{margin:.3rem 0}.admin-reports header p{max-width:680px;color:#607389;line-height:1.55}.admin-reports__filters{display:flex;gap:.55rem;margin-top:1.35rem}.admin-reports__filters button{border:1px solid #c9d8e4;border-radius:999px;background:#fff;color:#48627b;padding:.45rem .75rem;font:inherit;font-size:.83rem;font-weight:750;cursor:pointer}.admin-reports__filters button.active{border-color:#0b69d6;background:#eaf4ff;color:#0757ae}.admin-reports__filters b{margin-inline-start:.22rem}.admin-reports__list{display:grid;gap:1rem;margin-top:1.15rem}.admin-report,.admin-reports__empty{background:#fff;border:1px solid #dbe6ef;border-radius:1rem;padding:1.15rem}.admin-report__head{display:flex;justify-content:space-between;gap:1rem}.admin-report__head p{margin:.25rem 0 0;color:#66798d;text-transform:capitalize}.admin-report__head span{height:max-content;border-radius:999px;background:#fff4d6;color:#9a6100;padding:.3rem .55rem;font-size:.75rem;font-weight:800;text-transform:capitalize}.admin-report--resolved .admin-report__head span,.admin-report--dismissed .admin-report__head span{background:#eef2f6;color:#526477}.admin-report__details{white-space:pre-wrap;line-height:1.55}.admin-report__actions{display:flex;flex-wrap:wrap;gap:.6rem}.admin-report button{border:1px solid #c9d8e4;border-radius:.55rem;background:#fff;color:#29445d;padding:.55rem .8rem;font-weight:750;cursor:pointer}.admin-report button.danger{background:#b42318;color:#fff;border-color:#b42318}.admin-report button.danger--strong{background:#7a271a;border-color:#7a271a}.admin-report button:disabled{opacity:.6;cursor:wait}.admin-report__resolution{margin:0;color:#526477;font-size:.9rem}@media(max-width:600px){.admin-report__head{flex-direction:column}.admin-report__actions button{flex:1}}`}</style>
  </section>;
};

export default ProductReportsPage;
