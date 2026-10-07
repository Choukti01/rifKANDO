import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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

  useEffect(() => {
    let isCurrent = true;

    const loadProduct = async () => {
      try {
        const response = await api.get(`/products/${id}`);
        if (!isCurrent) return;

        const product = response.data.product;
        setFormData({
          title: product.title || '',
          description: product.description || '',
          price: product.price || '',
          old_price: product.old_price || '',
          category: product.category || 'electronics',
          stock: product.stock || '',
          condition: product.condition || 'new',
          origin_city: product.origin_city || '',
          preparation_days: product.preparation_days ?? '1',
        });
        setMedia(product.media?.map(m => ({ url: m.media_url, type: m.media_type })) || []);
      } catch (error) {
        if (isCurrent) {
          console.error('Error fetching product:', error);
          toast.error('Failed to load product data');
          navigate('/seller/dashboard/products');
        }
      } finally {
        if (isCurrent) setFetching(false);
      }
    };

    void loadProduct();

    return () => {
      isCurrent = false;
    };
  }, [id, navigate]);

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

    if (title.length < 2) return toast.error('Product title must contain at least 2 characters.');
    if (description.length < 10) return toast.error('Description must contain at least 10 characters.');
    if (!Number.isFinite(price) || price <= 0) return toast.error('Enter a valid product price.');
    if (!Number.isInteger(stock) || stock < 0) return toast.error('Stock must be a whole number of 0 or more.');
    if (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice < price)) {
      return toast.error('Original price must be at least the current product price.');
    }
    if (!media.length) return toast.error('Keep at least one clear product photo before saving.');

    setLoading(true);
    try {
      const productData = {
        ...formData,
        title,
        description,
        price,
        stock,
        condition: formData.condition,
        origin_city: formData.origin_city.trim(),
        preparation_days: Number(formData.preparation_days),
        media: media.map((m, idx) => ({ ...m, order: idx, isPrimary: idx === 0 }))
      };
      if (oldPrice !== undefined) productData.old_price = oldPrice;
      else delete productData.old_price;
      await api.put(`/products/${id}`, productData);
      toast.success('Product updated successfully!');
      navigate('/seller/dashboard/products');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.error || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const productPrice = Number(formData.price);
  const hasValidPrice = Number.isFinite(productPrice) && productPrice > 0;
  const platformCommission = hasValidPrice ? productPrice * 0.05 : 0;
  const sellerNet = hasValidPrice ? productPrice - platformCommission : 0;

  if (fetching) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading product data...</p>
      </div>
    );
  }

  return (
    <div className="edit-product">
      <h2>Edit Product</h2>
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label>Product Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-input"
            rows="4"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price (MAD) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>Original Price (Optional)</label>
            <input
              type="number"
              name="old_price"
              value={formData.old_price}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Dispatch city</label><input name="origin_city" value={formData.origin_city} onChange={handleChange} className="form-input" maxLength="100" placeholder="e.g. Nador" /><small className="form-hint">Shown to buyers as the seller’s dispatch location.</small></div>
          <div className="form-group"><label>Preparation time</label><select name="preparation_days" value={formData.preparation_days} onChange={handleChange} className="form-input"><option value="0">Same day</option>{[1,2,3,4,5,7,10,14].map((days) => <option key={days} value={days}>{days} day{days === 1 ? '' : 's'}</option>)}</select><small className="form-hint">rifKANDO COD Operations sets the buyer delivery deadline after you confirm the order.</small></div>
        </div>

        <aside className="listing-estimate" aria-live="polite">
          <div>
            <span>COD listing estimate</span>
            <strong>{hasValidPrice ? `${sellerNet.toFixed(2)} MAD` : 'Enter a product price'}</strong>
          </div>
          <p>rifKANDO commission is 5% of the item price only ({hasValidPrice ? `${platformCommission.toFixed(2)} MAD` : '—'}). rifKANDO COD Operations quotes delivery after an order is confirmed.</p>
          <small>Update the cover image or order below to control what buyers see first.</small>
        </aside>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="electronics">Electronics</option>
              <option value="fashion">Fashion</option>
              <option value="handicrafts">Handicrafts</option>
              <option value="books">Books</option>
              <option value="home">Home & Living</option>
            </select>
          </div>
          <div className="form-group">
            <label>Stock Quantity *</label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
        </div>

        {/* Condition selector (NEW) */}
        <div className="form-group">
          <label>Condition *</label>
          <select
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            className="form-input"
            required
          >
            <option value="new">New</option>
            <option value="used_as_new">Used as New</option>
            <option value="joutiya">Joutiya (Haggle)</option>
          </select>
          <small className="form-hint">
            {formData.condition === 'joutiya' && "Buyers can make offers instead of buying directly."}
            {formData.condition === 'used_as_new' && "Item is pre‑owned but in perfect condition."}
            {formData.condition === 'new' && "Brand new, never used."}
          </small>
        </div>

        <div className="form-group">
          <label>Product Photos & Videos (max 10)</label>
          <MediaUploader onMediaUploaded={setMedia} existingMedia={media} maxFiles={10} allowedTypes={['image', 'video']} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Update Product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/seller/dashboard/products')}
            className="btn btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>

      <style>{`
        .edit-product {
          max-width: 800px;
          margin: 0 auto;
        }
        .edit-product h2 {
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

export default EditProduct;
