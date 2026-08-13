import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';
import DigitalFileUploader from '../../../components/digital/DigitalFileUploader';
import { getDigitalProductForManagement, updateDigitalProduct } from '../../../services/api';

const EditDigitalProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [media, setMedia] = useState([]);
  const [existingFile, setExistingFile] = useState(null);
  const [replacementFile, setReplacementFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await getDigitalProductForManagement(id);
        if (!active) return;
        const product = response.data.product;
        setFormData({
          title: product.title || '', description: product.description || '', price: String(product.price ?? ''),
          old_price: product.old_price ? String(product.old_price) : '', category: product.category || 'ebooks',
          download_limit: String(product.download_limit ?? 0), image: product.image || '💻',
        });
        setExistingFile({
          file_name: product.file_name, file_size_bytes: product.file_size_bytes, file_content_type: product.file_content_type,
        });
        setMedia((product.media || []).map((item) => ({ url: item.media_url, type: item.media_type })));
      } catch (error) {
        if (active) {
          toast.error(error.response?.data?.error || 'Unable to load this digital product.');
          navigate('/seller/dashboard/digital');
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [id, navigate]);

  const change = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const deliveryPayload = replacementFile ? {
        file_type: 'file', file_url: replacementFile.storageReference, upload_receipt: replacementFile.uploadReceipt,
      } : {};
      await updateDigitalProduct(id, {
        ...formData,
        price: Number(formData.price),
        old_price: formData.old_price ? Number(formData.old_price) : null,
        download_limit: Number.parseInt(formData.download_limit, 10) || 0,
        media,
        ...deliveryPayload,
      });
      toast.success('Digital product updated.');
      navigate('/seller/dashboard/digital');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to update this digital product.');
    } finally {
      setSaving(false);
    }
  };

  if (!formData) return <div className="text-center py-16"><div className="spinner" /><p>Loading digital product...</p></div>;

  return (
    <main className="digital-editor-shell">
      <header className="digital-editor-heading"><p className="digital-eyebrow">Digital catalogue</p><h1>Edit digital product</h1><p>Updates to the delivery file apply to new access grants only. Earlier buyer downloads keep their original file.</p></header>
      <form className="digital-editor-form" onSubmit={submit}>
        <section className="digital-editor-section">
          <h2>Listing details</h2>
          <div className="digital-field"><label htmlFor="digital-title">Title <span>*</span></label><input id="digital-title" name="title" value={formData.title} onChange={change} minLength="2" maxLength="160" required /></div>
          <div className="digital-field"><label htmlFor="digital-description">What does the customer receive? <span>*</span></label><textarea id="digital-description" name="description" value={formData.description} onChange={change} minLength="10" maxLength="5000" rows="6" required /></div>
          <div className="digital-fields-grid"><div className="digital-field"><label htmlFor="digital-category">Category <span>*</span></label><select id="digital-category" name="category" value={formData.category} onChange={change}><option value="ebooks">E-books</option><option value="software">Software</option><option value="templates">Templates</option><option value="music">Music & audio</option><option value="graphics">Graphics & design</option><option value="other">Other</option></select></div><div className="digital-field"><label htmlFor="digital-icon">Listing icon</label><input id="digital-icon" name="image" value={formData.image} onChange={change} maxLength="64" /></div></div>
        </section>
        <section className="digital-editor-section"><h2>Price and access</h2><div className="digital-fields-grid"><div className="digital-field"><label htmlFor="digital-price">Price (MAD) <span>*</span></label><input id="digital-price" name="price" type="number" min="0.01" step="0.01" value={formData.price} onChange={change} required /></div><div className="digital-field"><label htmlFor="digital-old-price">Previous price (optional)</label><input id="digital-old-price" name="old_price" type="number" min="0.01" step="0.01" value={formData.old_price} onChange={change} /></div><div className="digital-field"><label htmlFor="digital-download-limit">Download limit</label><input id="digital-download-limit" name="download_limit" type="number" min="0" max="10000" step="1" value={formData.download_limit} onChange={change} /><small>Use 0 for unlimited downloads.</small></div></div></section>
        <section className="digital-editor-section"><h2>Private delivery file</h2><DigitalFileUploader value={replacementFile} onChange={setReplacementFile} existingFile={existingFile} /></section>
        <section className="digital-editor-section"><h2>Listing previews</h2><p className="digital-section-copy">Public preview images are separate from your private delivery file.</p><MediaUploader onMediaUploaded={setMedia} existingMedia={media} maxFiles={10} /></section>
        <div className="digital-editor-actions"><button type="button" className="digital-button secondary" onClick={() => navigate('/seller/dashboard/digital')}>Cancel</button><button type="submit" className="digital-button primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
      </form>
      <style>{`
        .digital-editor-shell { max-width: 900px; margin: 0 auto; padding: 8px 0 28px; color: #172b32; }.digital-editor-heading { margin: 0 0 24px; }.digital-eyebrow { margin: 0 0 7px; color: #216275; font-size: .78rem; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }.digital-editor-heading h1 { margin: 0; font-size: clamp(1.55rem, 3vw, 2rem); letter-spacing: -.03em; }.digital-editor-heading p:not(.digital-eyebrow) { max-width: 700px; margin: 8px 0 0; color: #5e7077; line-height: 1.6; }.digital-editor-form { display: grid; gap: 16px; }.digital-editor-section { padding: 22px; border: 1px solid #deeaed; border-radius: 16px; background: #fff; box-shadow: 0 6px 22px rgba(20, 59, 68, .045); }.digital-editor-section h2 { margin: 0 0 16px; font-size: 1.05rem; }.digital-editor-section h2 span, .digital-field label span { color: #216275; }.digital-section-copy { margin: -7px 0 15px; color: #657980; font-size: .85rem; line-height: 1.5; }.digital-fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; }.digital-field { display: grid; gap: 7px; margin-bottom: 15px; }.digital-field:last-child { margin-bottom: 0; }.digital-field label { color: #294249; font-size: .85rem; font-weight: 700; }.digital-field input, .digital-field textarea, .digital-field select { width: 100%; min-width: 0; border: 1px solid #c9d9dd; border-radius: 10px; padding: 11px 12px; color: #18363e; background: #fff; font: inherit; outline: none; transition: border-color .2s, box-shadow .2s; }.digital-field textarea { resize: vertical; }.digital-field input:focus, .digital-field textarea:focus, .digital-field select:focus { border-color: #216275; box-shadow: 0 0 0 3px rgba(33, 98, 117, .12); }.digital-field small { color: #63777d; font-size: .76rem; }.digital-editor-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }.digital-button { border-radius: 10px; padding: 11px 16px; font-weight: 750; cursor: pointer; transition: transform .2s, background .2s; }.digital-button:hover:not(:disabled) { transform: translateY(-1px); }.digital-button:disabled { cursor: not-allowed; opacity: .55; }.digital-button.primary { border: 1px solid #216275; background: #216275; color: #fff; }.digital-button.primary:hover:not(:disabled) { background: #194d5c; }.digital-button.secondary { border: 1px solid #c6d6da; background: #fff; color: #29464f; }@media (max-width: 620px) { .digital-editor-shell { padding-bottom: 20px; }.digital-editor-section { padding: 17px; }.digital-fields-grid { grid-template-columns: 1fr; gap: 0; }.digital-editor-actions { justify-content: stretch; }.digital-button { flex: 1; } }
      `}</style>
    </main>
  );
};

export default EditDigitalProduct;
