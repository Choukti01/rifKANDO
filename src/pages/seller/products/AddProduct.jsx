import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';
import { useTranslation } from 'react-i18next';

const AddProduct = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    old_price: '',
    category: 'electronics',
    stock: '',
    condition: 'new',
    origin_city: '',
    preparation_days: '1',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = formData.title.trim();
    const description = formData.description.trim();
    const price = Number(formData.price);
    const stock = Number(formData.stock);
    const oldPrice = formData.old_price === '' ? undefined : Number(formData.old_price);

    if (title.length < 2) return toast.error(t('productForm.validation.title'));
    if (description.length < 10) return toast.error(t('productForm.validation.description'));
    if (!Number.isFinite(price) || price <= 0) return toast.error(t('productForm.validation.price'));
    if (!Number.isInteger(stock) || stock < 0) return toast.error(t('productForm.validation.stock'));
    if (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice < price)) {
      return toast.error(t('productForm.validation.originalPrice'));
    }
    if (!media.length) return toast.error(t('productForm.validation.media'));

    setLoading(true);
    try {
      const productData = {
        title,
        description,
        price,
        stock,
        category: formData.category,
        condition: formData.condition,
        origin_city: formData.origin_city.trim(),
        preparation_days: Number(formData.preparation_days),
        media: media.map(({ url, type }) => ({ url, type })),
      };
      if (oldPrice !== undefined) productData.old_price = oldPrice;
      const response = await api.post('/products', productData);
      if (response.data.success) {
        toast.success(t('productForm.created'));
        navigate('/seller/dashboard/products');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      const fieldError = error.response?.data?.fields?.[0];
      toast.error(fieldError
        ? `${fieldError.field}: ${fieldError.message}`
        : (error.response?.data?.error || t('productForm.createFailed')));
    } finally {
      setLoading(false);
    }
  };

  const productPrice = Number(formData.price);
  const hasValidPrice = Number.isFinite(productPrice) && productPrice > 0;
  const platformCommission = hasValidPrice ? productPrice * 0.05 : 0;
  const sellerNet = hasValidPrice ? productPrice - platformCommission : 0;

  return (
    <div className="add-product">
      <h2>{t('productForm.addTitle')}</h2>
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label>{t('productForm.title')} *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="form-input"
            minLength="2"
            required
          />
        </div>

        <div className="form-group">
          <label>{t('productForm.description')} *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-input"
            rows="4"
            minLength="10"
            required
          />
          <small className="form-hint">{t('productForm.descriptionHelp')}</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('productForm.price')} *</label>
            <input
              type="number"
              name="price"
              min="0.01"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>{t('productForm.originalPrice')}</label>
            <input
              type="number"
              name="old_price"
              min="0.01"
              step="0.01"
              value={formData.old_price}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>{t('productForm.dispatchCity')}</label><input name="origin_city" value={formData.origin_city} onChange={handleChange} className="form-input" maxLength="100" placeholder={t('productForm.dispatchCityPlaceholder')} /><small className="form-hint">{t('productForm.dispatchCityHelp')}</small></div>
          <div className="form-group"><label>{t('productForm.preparation')}</label><select name="preparation_days" value={formData.preparation_days} onChange={handleChange} className="form-input"><option value="0">{t('productForm.sameDay')}</option>{[1,2,3,4,5,7,10,14].map((days) => <option key={days} value={days}>{t('productForm.dayCount', { count: days })}</option>)}</select><small className="form-hint">{t('productForm.preparationHelp')}</small></div>
        </div>

        <aside className="listing-estimate" aria-live="polite">
          <div>
            <span>{t('productForm.estimate')}</span>
            <strong>{hasValidPrice ? `${sellerNet.toFixed(2)} MAD` : t('productForm.enterPrice')}</strong>
          </div>
          <p>
            {t('productForm.commission', { amount: hasValidPrice ? `${platformCommission.toFixed(2)} MAD` : '—' })}
            {hasValidPrice && ` ${t('productForm.deliveryQuote')}`}
          </p>
          <small>{t('productForm.settlementNote')}</small>
        </aside>

        <div className="form-row">
          <div className="form-group">
            <label>{t('productForm.category')} *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
              required
            >
              {['electronics', 'fashion', 'handicrafts', 'books', 'home'].map((category) => <option key={category} value={category}>{t(`productForm.categoryOptions.${category}`)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('productForm.stock')} *</label>
            <input
              type="number"
              name="stock"
              min="0"
              step="1"
              value={formData.stock}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
        </div>

        {/* NEW: Condition selector */}
        <div className="form-group">
          <label>{t('productForm.condition')} *</label>
          <select
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            className="form-input"
            required
          >
            {['new', 'used_as_new', 'joutiya'].map((condition) => <option key={condition} value={condition}>{t(`productForm.conditionOptions.${condition}`)}</option>)}
          </select>
          <small className="form-hint">
            {t(`productForm.conditionHelp.${formData.condition}`)}
          </small>
        </div>

        <div className="form-group">
          <label>{t('productForm.media')}</label>
          <MediaUploader onMediaUploaded={setMedia} existingMedia={media} maxFiles={10} allowedTypes={['image', 'video']} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('productForm.publishing') : t('productForm.publish')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/seller/dashboard/products')}
            className="btn btn-outline"
          >
            {t('productForm.cancel')}
          </button>
        </div>
      </form>

      <style>{`
        .add-product {
          max-width: 800px;
          margin: 0 auto;
        }
        .add-product h2 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .product-form {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .form-hint {
          display: block;
          font-size: 0.7rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
        .listing-estimate { display:grid; gap:.55rem; margin:0 0 1.25rem; padding:1rem; border:1px solid #cfe5f3; border-radius:.75rem; background:#f6fbfe; }
        .listing-estimate > div { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; }
        .listing-estimate span { color:#216275; font-size:.72rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
        .listing-estimate strong { color:#102a43; font-size:1.05rem; }
        .listing-estimate p, .listing-estimate small { margin:0; color:#526579; font-size:.78rem; line-height:1.5; }
        .listing-estimate small { color:#216275; }
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .btn-primary {
          background: #1a1a1a;
          color: white;
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid #e5e7eb;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        @media (max-width: 640px) { .product-form { padding:1rem; } .form-row { grid-template-columns:1fr; } .form-actions { flex-direction:column; } .form-actions button { min-height:48px; } }
      `}</style>
    </div>
  );
};

export default AddProduct;
