import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { createFinditRequest, uploadFinditMedia } from '../../services/api';
import { useTranslation } from 'react-i18next';

const initialForm = {
  title: '', description: '', category: 'Auto & Parts', city: '',
  preferred_condition: 'any', budget_max: '0', expires_in_days: 7,
};

const FindItRequestForm = ({ onCreated }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(initialForm);
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const remaining = 3 - media.length;
    if (files.length > remaining) {
      toast.error(t('findit.form.photoLimit'));
      event.target.value = '';
      return;
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      toast.error(t('findit.form.photoRequirements'));
      event.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const payload = new FormData();
        payload.append('media', file);
        const response = await uploadFinditMedia(payload);
        uploaded.push({ url: response.data.url, type: 'image' });
      }
      setMedia((current) => [...current, ...uploaded]);
    } catch (error) {
      toast.error(error.response?.data?.error || t('findit.form.uploadError'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const budget = Number(form.budget_max || 0);
    const expiresInDays = Number.parseInt(form.expires_in_days, 10);
    if (!Number.isFinite(budget) || budget < 0) {
      toast.error(t('findit.form.validBudget'));
      return;
    }
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 14) {
      toast.error(t('findit.form.validDuration'));
      return;
    }
    setSubmitting(true);
    try {
      const response = await createFinditRequest({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        city: form.city.trim(),
        preferred_condition: form.preferred_condition,
        budget_max: budget,
        expires_in_days: expiresInDays,
        media: media.map((item) => ({ url: item.url, type: 'image' })),
      });
      setForm(initialForm);
      setMedia([]);
      toast.success(t('findit.form.created'));
      onCreated?.(response.data.request);
    } catch (error) {
      const validationMessage = error.response?.data?.fields?.[0]?.message;
      toast.error(validationMessage || error.response?.data?.error || t('findit.form.publish'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="findit-request-form" onSubmit={submit}>
      <div className="findit-form-heading">
        <div><span>{t('findit.form.eyebrow')}</span><h2>{t('findit.form.title')}</h2></div>
        <p>{t('findit.form.description')}</p>
      </div>
      <div className="findit-form-grid">
        <label className="findit-field wide"><span>{t('findit.form.titleLabel')}</span><input name="title" value={form.title} onChange={update} minLength="3" maxLength="160" placeholder={t('findit.form.titlePlaceholder')} required /></label>
        <label className="findit-field wide"><span>{t('findit.form.detailsLabel')}</span><textarea name="description" value={form.description} onChange={update} minLength="10" maxLength="2000" rows="4" placeholder={t('findit.form.detailsPlaceholder')} required /></label>
        <label className="findit-field"><span>{t('findit.form.category')}</span><select name="category" value={form.category} onChange={update}><option value="Auto & Parts">{t('findit.form.categories.auto')}</option><option value="Phones & Electronics">{t('findit.form.categories.electronics')}</option><option value="Home & Appliances">{t('findit.form.categories.home')}</option><option value="Tools & Equipment">{t('findit.form.categories.tools')}</option><option value="Fashion & Accessories">{t('findit.form.categories.fashion')}</option><option value="Other">{t('findit.form.categories.other')}</option></select></label>
        <label className="findit-field"><span>{t('findit.form.city')}</span><input name="city" value={form.city} onChange={update} minLength="2" maxLength="100" placeholder={t('findit.form.cityPlaceholder')} required /></label>
        <label className="findit-field"><span>{t('findit.form.condition')}</span><select name="preferred_condition" value={form.preferred_condition} onChange={update}><option value="any">{t('findit.form.conditions.any')}</option><option value="new">{t('findit.form.conditions.new')}</option><option value="used">{t('findit.form.conditions.used')}</option></select></label>
        <label className="findit-field"><span>{t('findit.form.budget')}</span><input name="budget_max" value={form.budget_max} onChange={update} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" required /></label>
        <label className="findit-field"><span>{t('findit.form.duration')}</span><select name="expires_in_days" value={form.expires_in_days} onChange={update}>{[3, 5, 7, 10, 14].map((days) => <option key={days} value={days}>{t('findit.form.days', { count: days })}</option>)}</select></label>
        <div className="findit-upload wide">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} hidden />
          <div className="findit-upload-copy"><PhotoIcon aria-hidden="true" /><div><strong>{t('findit.form.photos')}</strong><span>{t('findit.form.photosHelp')}</span></div></div>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading || media.length >= 3}><ArrowUpTrayIcon aria-hidden="true" />{uploading ? t('findit.form.uploading') : t('findit.form.addPhotos')}</button>
        </div>
        {media.length > 0 && <div className="findit-photo-list wide">{media.map((item) => <figure key={item.url}><img src={item.url} alt={t('findit.form.photos')} /><button type="button" aria-label={t('findit.form.removePhoto')} onClick={() => setMedia((current) => current.filter((mediaItem) => mediaItem.url !== item.url))}><XMarkIcon /></button></figure>)}</div>}
      </div>
      <div className="findit-form-footer"><p>{t('findit.form.footer')}</p><button type="submit" disabled={submitting || uploading}>{submitting ? t('findit.form.publishing') : t('findit.form.publish')}</button></div>
      <style>{`
        .findit-request-form { background:#fff; border:1px solid #dce8f2; border-radius:1.15rem; box-shadow:0 16px 35px rgba(10,27,53,.06); padding:clamp(1rem,3vw,1.5rem); }
        .findit-form-heading { display:flex; gap:1rem; justify-content:space-between; margin-bottom:1.25rem; }.findit-form-heading span { color:var(--color-brand-blue); font-size:.72rem; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }.findit-form-heading h2 { color:var(--color-brand-ink); font-size:1.25rem; letter-spacing:-.025em; margin:.35rem 0 0; }.findit-form-heading p { color:#607084; font-size:.84rem; line-height:1.5; margin:0; max-width:17rem; }
        .findit-form-grid { display:grid; gap:.9rem; grid-template-columns:repeat(3,minmax(0,1fr)); }.findit-field { display:grid; gap:.38rem; }.findit-field.wide,.wide { grid-column:1 / -1; }.findit-field span { color:#44556a; font-size:.77rem; font-weight:800; }.findit-field input,.findit-field textarea,.findit-field select { background:#fff; border:1px solid #cbd9e5; border-radius:.65rem; color:var(--color-brand-ink); font:inherit; padding:.7rem .78rem; width:100%; }.findit-field textarea { resize:vertical; }.findit-field input:focus,.findit-field textarea:focus,.findit-field select:focus { border-color:var(--color-brand-blue); box-shadow:0 0 0 3px rgba(65,173,255,.16); outline:none; }
        .findit-upload { align-items:center; background:#f6faff; border:1px dashed #aac9e3; border-radius:.8rem; display:flex; gap:.75rem; justify-content:space-between; padding:.8rem; }.findit-upload-copy { align-items:center; display:flex; gap:.7rem; min-width:0; }.findit-upload-copy svg { color:var(--color-brand-blue); height:1.4rem; flex:0 0 auto; width:1.4rem; }.findit-upload-copy strong,.findit-upload-copy span { display:block; }.findit-upload-copy strong { color:var(--color-brand-ink); font-size:.82rem; }.findit-upload-copy span { color:#637489; font-size:.74rem; line-height:1.4; margin-top:.12rem; }
        .findit-upload button,.findit-form-footer button { align-items:center; background:var(--color-brand-ink); border:0; border-radius:.65rem; color:#fff; cursor:pointer; display:inline-flex; font:inherit; font-size:.8rem; font-weight:800; gap:.4rem; justify-content:center; padding:.68rem .82rem; white-space:nowrap; }.findit-upload button { background:var(--color-brand-blue); color:var(--color-brand-ink); }.findit-upload button svg { height:1rem; width:1rem; }.findit-upload button:disabled,.findit-form-footer button:disabled { cursor:not-allowed; opacity:.55; }
        .findit-photo-list { display:flex; flex-wrap:wrap; gap:.65rem; }.findit-photo-list figure { height:5.2rem; margin:0; position:relative; width:5.2rem; }.findit-photo-list img { border:1px solid #dce8f2; border-radius:.65rem; height:100%; object-fit:cover; width:100%; }.findit-photo-list button { align-items:center; background:#10233e; border:0; border-radius:50%; color:#fff; cursor:pointer; display:flex; height:1.35rem; justify-content:center; padding:0; position:absolute; right:-.35rem; top:-.35rem; width:1.35rem; }.findit-photo-list button svg { height:.88rem; width:.88rem; }
        .findit-form-footer { align-items:center; border-top:1px solid #e5edf4; display:flex; gap:1rem; justify-content:space-between; margin-top:1.15rem; padding-top:1rem; }.findit-form-footer p { color:#607084; font-size:.76rem; line-height:1.45; margin:0; max-width:31rem; }@media (max-width:720px) { .findit-form-heading,.findit-upload,.findit-form-footer { align-items:flex-start; flex-direction:column; } .findit-form-grid { grid-template-columns:1fr; } .findit-upload button,.findit-form-footer button { width:100%; } }
      `}</style>
    </form>
  );
};

export default FindItRequestForm;
