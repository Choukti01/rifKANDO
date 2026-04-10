import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const AddProduct = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    old_price: '',
    category: 'electronics',
    stock: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        old_price: formData.old_price ? parseFloat(formData.old_price) : null,
        stock: parseInt(formData.stock) || 0,
        media: media.map((m, idx) => ({ ...m, order: idx, isPrimary: idx === 0 }))
      };
      const response = await api.post('/products', productData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        toast.success('Product created successfully!');
        navigate('/seller/dashboard/products');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to create product');
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
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
        </div>
        <div className="form-group">
          <label>Description *</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="form-input" rows="4" required />
        </div>
        <div className="form-row">
          <div className="form-group"><label>Price (MAD) *</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" required /></div>
          <div className="form-group"><label>Original Price (Optional)</label><input type="number" name="old_price" value={formData.old_price} onChange={handleChange} className="form-input" /></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} className="form-input" required>
              <option value="electronics">Electronics</option><option value="fashion">Fashion</option>
              <option value="handicrafts">Handicrafts</option><option value="books">Books</option>
              <option value="home">Home & Living</option>
            </select>
          </div>
          <div className="form-group"><label>Stock Quantity *</label><input type="number" name="stock" value={formData.stock} onChange={handleChange} className="form-input" required /></div>
        </div>

        <div className="form-group">
          <label>Product Images & Videos (max 10)</label>
          <MediaUploader onMediaUploaded={setMedia} maxFiles={10} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Publish Product'}</button>
          <button type="button" onClick={() => navigate('/seller/dashboard/products')} className="btn btn-outline">Cancel</button>
        </div>
      </form>
      <style>{`
        .add-product { max-width: 800px; margin: 0 auto; }
        .add-product h2 { font-size: 1.25rem; margin-bottom: 1.5rem; }
        .product-form { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .btn-primary { background: #1a1a1a; color: white; padding: 0.625rem 1.25rem; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-outline { background: transparent; border: 1px solid #e5e7eb; padding: 0.625rem 1.25rem; border-radius: 0.5rem; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default AddProduct;