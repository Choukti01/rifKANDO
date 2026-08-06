import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const EditService = () => {
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
    category: 'design',
    delivery_time: '',
    revisions: '',
    image: '🛠️'
  });

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/services/${id}`);
      const service = response.data.service;
      setFormData({
        title: service.title || '',
        description: service.description || '',
        price: service.price || '',
        old_price: service.old_price || '',
        category: service.category || 'design',
        delivery_time: service.delivery_time || '',
        revisions: service.revisions || '',
        image: service.image || '🛠️'
      });
      if (service.media && service.media.length) {
        setMedia(service.media.map(m => ({ 
  url: m.media_url,
  type: m.media_type 
})));
      }
    } catch (error) {
      console.error('Error fetching service:', error);
      toast.error('Failed to load service data');
      navigate('/seller/dashboard/services');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const serviceData = {
        ...formData,
        price: parseFloat(formData.price),
        old_price: formData.old_price ? parseFloat(formData.old_price) : null,
        revisions: parseInt(formData.revisions) || 0,
        media: media.map((m, idx) => ({ 
  ...m, 
  url: m.url,
  order: idx, 
  isPrimary: idx === 0 
}))
      };
      
      await api.put(`/services/${id}`, serviceData);
      
      toast.success('Service updated successfully!');
      navigate('/seller/dashboard/services');
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error(error.response?.data?.error || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading service data...</p>
      </div>
    );
  }

  return (
    <div className="edit-service">
      <h2>Edit Service</h2>
      <form onSubmit={handleSubmit} className="service-form">
        <div className="form-group">
          <label>Service Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
        </div>

        <div className="form-group">
          <label>Service Description *</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="form-input" rows="4" required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price (MAD) *</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label>Original Price (Optional)</label>
            <input type="number" name="old_price" value={formData.old_price} onChange={handleChange} className="form-input" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} className="form-input" required>
              <option value="design">Design & Creative</option>
              <option value="development">Development & IT</option>
              <option value="marketing">Marketing & Sales</option>
              <option value="writing">Writing & Translation</option>
              <option value="video">Video & Animation</option>
              <option value="business">Business Consulting</option>
            </select>
          </div>
          <div className="form-group">
            <label>Delivery Time</label>
            <input type="text" name="delivery_time" value={formData.delivery_time} onChange={handleChange} className="form-input" placeholder="2 days" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Number of Revisions</label>
            <input type="number" name="revisions" value={formData.revisions} onChange={handleChange} className="form-input" placeholder="2" />
          </div>
          <div className="form-group">
            <label>Service Icon</label>
            <input type="text" name="image" value={formData.image} onChange={handleChange} className="form-input" placeholder="🛠️" />
          </div>
        </div>

        <div className="form-group">
          <label>Service Images & Videos (max 10)</label>
          <MediaUploader onMediaUploaded={setMedia} existingMedia={media} maxFiles={10} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Update Service'}
          </button>
          <button type="button" onClick={() => navigate('/seller/dashboard/services')} className="btn btn-outline">Cancel</button>
        </div>
      </form>

      <style>{`
        .edit-service { max-width: 800px; margin: 0 auto; }
        .edit-service h2 { font-size: 1.25rem; margin-bottom: 1.5rem; }
        .service-form { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
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

export default EditService;
