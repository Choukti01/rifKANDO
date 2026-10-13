import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckIcon, PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const emptyPackage = { name: '', price: '', delivery_time: '3 days', revisions: '1', features: '' };
const featureLines = (features) => String(features || '').split('\n').map((item) => item.trim()).filter(Boolean);

const PackagesManager = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [form, setForm] = useState(emptyPackage);

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/services/${id}`);
      setService(response.data.service);
      setPackages(response.data.service.packages || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'This service could not be loaded.');
      navigate('/seller/dashboard/services');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    const requestTimer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(requestTimer);
  }, [load]);

  const openEditor = (pkg = null) => {
    setEditorOpen(true);
    setEditingPackage(pkg);
    setForm(pkg ? {
      name: pkg.name || '', price: pkg.price ?? '', delivery_time: pkg.delivery_time || '3 days',
      revisions: pkg.revisions ?? '1', features: pkg.features || '',
    } : emptyPackage);
  };

  const closeEditor = () => {
    if (!saving) {
      setEditorOpen(false);
      setEditingPackage(null);
      setForm(emptyPackage);
    }
  };

  const savePackage = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(), price: Number(form.price), delivery_time: form.delivery_time.trim(),
      revisions: Number(form.revisions || 0), features: featureLines(form.features).join('\n'),
    };
    try {
      if (editingPackage?.id) {
        await api.put(`/services/${id}/packages/${editingPackage.id}`, payload);
        toast.success('Package updated.');
      } else {
        await api.post(`/services/${id}/packages`, payload);
        toast.success('Package added.');
      }
      setEditorOpen(false);
      setEditingPackage(null);
      setForm(emptyPackage);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.fields?.[0]?.message || error.response?.data?.error || 'Package could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const deletePackage = async (packageId) => {
    if (!window.confirm('Remove this package? Clients will no longer be able to choose it.')) return;
    try {
      await api.delete(`/services/${id}/packages/${packageId}`);
      toast.success('Package removed.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Package could not be removed.');
    }
  };

  if (loading) return <div className="service-packages-loading">Loading package workspace...</div>;

  return <main className="service-packages-page">
    <header className="service-packages-hero">
      <div><p>Service offer · pricing</p><h2>Packages clients can understand</h2><span>{service?.title}</span></div>
      <button type="button" onClick={() => openEditor()}><PlusIcon aria-hidden="true" />Add package</button>
    </header>

    <section className="service-packages-guidance">
      <div><strong>Keep options simple</strong><p>Create one clear package for each level of work. Every package needs a price, timeline, revisions, and included results.</p></div>
      <div><strong>Set expectations</strong><p>Clients see these details before requesting your service. Avoid vague names such as “basic” without explaining the scope.</p></div>
    </section>

    {packages.length ? <section className="service-packages-grid">
      {packages.map((pkg, index) => <article className="service-package-card" key={pkg.id}>
        <header><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{pkg.name}</h3><p>{Number(pkg.price || 0).toLocaleString()} MAD</p></div><div className="service-package-actions"><button type="button" onClick={() => openEditor(pkg)} aria-label={`Edit ${pkg.name}`}><PencilSquareIcon /></button><button type="button" onClick={() => deletePackage(pkg.id)} aria-label={`Delete ${pkg.name}`}><TrashIcon /></button></div></header>
        <div className="service-package-meta"><span>{pkg.delivery_time || 'Timeline agreed'}</span><span>{Number(pkg.revisions || 0)} revision{Number(pkg.revisions || 0) === 1 ? '' : 's'}</span></div>
        {featureLines(pkg.features).length ? <ul>{featureLines(pkg.features).map((feature) => <li key={feature}><CheckIcon aria-hidden="true" />{feature}</li>)}</ul> : <p className="service-package-empty">Add included results so clients understand this package.</p>}
      </article>)}
    </section> : <section className="service-packages-empty"><div><PlusIcon aria-hidden="true" /></div><h3>Create the first package</h3><p>Start with the smallest complete version of your service. You can add broader options after it.</p><button type="button" onClick={() => openEditor()}>Create package</button></section>}

    {editorOpen && <div className="service-package-modal" role="presentation" onMouseDown={closeEditor}>
      <form className="service-package-modal-card" onSubmit={savePackage} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p>{editingPackage?.id ? 'Edit package' : 'New package'}</p><h3>Define a complete client option</h3></div><button type="button" onClick={closeEditor} aria-label="Close package editor"><XMarkIcon /></button></header>
        <label>Package name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Example: Brand identity starter" maxLength="120" required /></label>
        <div className="service-package-form-grid"><label>Price (MAD)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="500" required /></label><label>Delivery time<select value={form.delivery_time} onChange={(event) => setForm((current) => ({ ...current, delivery_time: event.target.value }))}><option value="1 day">1 day</option><option value="2 days">2 days</option><option value="3 days">3 days</option><option value="5 days">5 days</option><option value="7 days">7 days</option><option value="Custom timeline">Custom timeline</option></select></label><label>Included revisions<input type="number" min="0" max="100" value={form.revisions} onChange={(event) => setForm((current) => ({ ...current, revisions: event.target.value }))} /></label></div>
        <label>What is included?<textarea value={form.features} onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))} rows="6" maxLength="3600" placeholder={'One item per line\nExample: 2 initial concepts\nFinal source files\nOne round of revisions'} /><small>Each line is shown as a clear included result for clients.</small></label>
        <footer><button type="button" onClick={closeEditor}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving...' : editingPackage?.id ? 'Save package' : 'Add package'}</button></footer>
      </form>
    </div>}

    <style>{`
      .service-packages-page{display:grid;gap:1rem;color:#173d5c}.service-packages-hero{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:clamp(1.2rem,3vw,2rem);border:1px solid rgba(24,116,182,.15);border-radius:23px;background:radial-gradient(circle at 90% 13%,rgba(75,183,243,.22),transparent 13rem),linear-gradient(135deg,#edfaff,#fff);box-shadow:0 14px 30px rgba(17,73,116,.07)}.service-packages-hero p,.service-package-modal-card header p{margin:0;color:#1b79b3;font-size:.68rem;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.service-packages-hero h2{margin:.35rem 0;color:#153d5d;font-size:clamp(1.3rem,3vw,1.9rem);letter-spacing:-.05em}.service-packages-hero span{color:#648196;font-size:.86rem}.service-packages-hero>button,.service-packages-empty button{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:43px;padding:0 .9rem;border:1px solid #126ea9;border-radius:13px;background:linear-gradient(135deg,#0e65a2,#258fd3);color:#fff;font:inherit;font-size:.8rem;font-weight:850;cursor:pointer;box-shadow:0 8px 18px rgba(18,108,169,.2)}.service-packages-hero button svg{width:1rem;height:1rem}.service-packages-guidance{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.service-packages-guidance>div,.service-package-card,.service-packages-empty{padding:1rem 1.1rem;border:1px solid rgba(23,114,184,.14);border-radius:18px;background:rgba(255,255,255,.9);box-shadow:0 8px 20px rgba(20,74,116,.045)}.service-packages-guidance strong{color:#245f87;font-size:.8rem}.service-packages-guidance p{margin:.35rem 0 0;color:#69869a;font-size:.78rem;line-height:1.5}.service-packages-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.service-package-card{display:grid;align-content:start;gap:1rem;min-height:245px}.service-package-card>header{display:flex;align-items:flex-start;gap:.65rem}.service-package-card>header>span{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:#e8f7ff;color:#1978b2;font-size:.69rem;font-weight:850}.service-package-card h3{margin:.04rem 0;color:#214862;font-size:1rem}.service-package-card header p{margin:.25rem 0 0;color:#0e6ea9;font-size:1.2rem;font-weight:900}.service-package-actions{display:flex;gap:.25rem;margin-inline-start:auto}.service-package-actions button,.service-package-modal-card header>button{display:grid;place-items:center;width:31px;height:31px;border:1px solid #d7e7f0;border-radius:9px;background:#fff;color:#4e748d;cursor:pointer}.service-package-actions button:last-child:hover{border-color:#f0c2c2;background:#fff5f5;color:#b64c4c}.service-package-actions svg,.service-package-modal-card header>button svg{width:1rem;height:1rem}.service-package-meta{display:flex;flex-wrap:wrap;gap:.45rem}.service-package-meta span{padding:.35rem .5rem;border-radius:99px;background:#eef8fd;color:#47738e;font-size:.7rem;font-weight:760}.service-package-card ul{display:grid;gap:.48rem;margin:0;padding:0;list-style:none;color:#527087;font-size:.78rem;line-height:1.35}.service-package-card li{display:flex;gap:.4rem}.service-package-card li svg{width:.95rem;height:.95rem;flex:0 0 auto;color:#159456}.service-package-empty{margin:0;padding:0!important;border:0!important;box-shadow:none!important;color:#7590a1;font-size:.77rem;line-height:1.5}.service-packages-empty{display:grid;justify-items:center;max-width:560px;margin:1rem auto;text-align:center}.service-packages-empty>div{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;background:#eaf8ff;color:#1680bf}.service-packages-empty svg{width:1.5rem;height:1.5rem}.service-packages-empty h3{margin:.75rem 0 .15rem;color:#254c67}.service-packages-empty p{max-width:360px;margin:0 0 1rem;color:#69869a;font-size:.82rem;line-height:1.5}.service-package-modal{position:fixed;z-index:2000;inset:0;display:grid;place-items:center;padding:1rem;background:rgba(10,34,51,.48);backdrop-filter:blur(5px)}.service-package-modal-card{width:min(100%,600px);max-height:calc(100vh - 2rem);overflow:auto;padding:clamp(1rem,3vw,1.5rem);border:1px solid rgba(255,255,255,.8);border-radius:22px;background:#fff;color:#254b65;box-shadow:0 20px 52px rgba(4,30,48,.28)}.service-package-modal-card header{display:flex;justify-content:space-between;gap:1rem;margin-bottom:1.2rem}.service-package-modal-card h3{margin:.28rem 0 0;color:#173e5d;font-size:1.12rem}.service-package-modal-card label{display:grid;gap:.4rem;margin-top:.9rem;color:#2e5875;font-size:.8rem;font-weight:790}.service-package-modal-card input,.service-package-modal-card textarea,.service-package-modal-card select{width:100%;border:1px solid #d1e2ec;border-radius:12px;background:#fcfeff;color:#193f5c;font:inherit;padding:.72rem .78rem;outline:none}.service-package-modal-card textarea{resize:vertical;line-height:1.5}.service-package-modal-card input:focus,.service-package-modal-card textarea:focus,.service-package-modal-card select:focus{border-color:#218bce;box-shadow:0 0 0 3px rgba(33,139,206,.13)}.service-package-modal-card small{color:#7790a1;font-size:.7rem;font-weight:500}.service-package-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.7rem}.service-package-modal-card footer{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.3rem}.service-package-modal-card footer button{min-height:40px;padding:0 .85rem;border:1px solid #cbdfea;border-radius:11px;background:#fff;color:#35647f;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}.service-package-modal-card footer button[type=submit]{border-color:#126da9;background:linear-gradient(135deg,#0e65a2,#268fd3);color:#fff}.service-package-modal-card footer button:disabled{opacity:.62;cursor:wait}.service-packages-loading{padding:4rem 1rem;text-align:center;color:#577990}@media(max-width:940px){.service-packages-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.service-packages-hero{align-items:flex-start;flex-direction:column}.service-packages-hero>button{width:100%}.service-packages-guidance,.service-packages-grid,.service-package-form-grid{grid-template-columns:1fr}.service-package-modal{align-items:end;padding:0}.service-package-modal-card{width:100%;max-height:90vh;border-radius:22px 22px 0 0}.service-package-modal-card footer{position:sticky;bottom:-1.5rem;margin-inline:-1rem;padding:1rem;background:#fff}}
    `}</style>
  </main>;
};

export default PackagesManager;
