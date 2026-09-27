import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    old_price: '',
    delivery_fee: '50',
    category: 'electronics',
    stock: '',
    condition: 'new',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = formData.title.trim();
    const description = formData.description.trim();
    const price = Number(formData.price);
    const deliveryFee = Number(formData.delivery_fee || 0);
    const stock = Number(formData.stock);
    const oldPrice = formData.old_price === '' ? undefined : Number(formData.old_price);

    if (title.length < 2) return toast.error('Product title must contain at least 2 characters.');
    if (description.length < 10) return toast.error('Description must contain at least 10 characters.');
    if (!Number.isFinite(price) || price <= 0) return toast.error('Enter a valid product price.');
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) return toast.error('Enter a valid delivery price.');
    if (!Number.isInteger(stock) || stock < 0) return toast.error('Stock must be a whole number of 0 or more.');
    if (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice < price)) {
      return toast.error('Original price must be at least the current product price.');
    }

    setLoading(true);
    try {
      const productData = {
        title,
        description,
        price,
        delivery_fee: deliveryFee,
        stock,
        category: formData.category,
        condition: formData.condition,
        media: media.map(({ url, type }) => ({ url, type })),
      };
      if (oldPrice !== undefined) productData.old_price = oldPrice;
      const response = await api.post('/products', productData);
      if (response.data.success) {
        toast.success('Product created successfully!');
        navigate('/seller/dashboard/products');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      const fieldError = error.response?.data?.fields?.[0];
      toast.error(fieldError
        ? `${fieldError.field}: ${fieldError.message}`
        : (error.response?.data?.error || 'Failed to create product'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-product">
      <h2>Add New Product</h2>
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label>Product Title *</label>
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
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-input"
            rows="4"
            minLength="10"
            required
          />
          <small className="form-hint">Use at least 10 characters so buyers understand the listing.</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price (MAD) *</label>
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
            <label>Original Price (Optional)</label>
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
        <div className="form-group">
          <label>Delivery price paid by buyer (MAD) *</label>
          <input type="number" name="delivery_fee" min="0" step="0.01" value={formData.delivery_fee} onChange={handleChange} className="form-input" required />
          <small className="form-hint">Set the COD delivery price for your preferred carrier. rifKANDO does not take commission from delivery.</small>
        </div>

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
            <option value="joutiya">Joutiya </option>
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
            {loading ? 'Creating...' : 'Publish Product'}
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
      `}</style>
    </div>
  );
};

export default AddProduct;
