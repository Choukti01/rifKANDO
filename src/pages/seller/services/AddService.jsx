import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AddService = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
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
        revisions: parseInt(formData.revisions) || 2
      };
      
      await api.post('/services', serviceData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Service created successfully!');
      navigate('/seller/dashboard/services');
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error(error.response?.data?.error || 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-service">
      <h2>Add New Service</h2>
      <form onSubmit={handleSubmit} className="service-form">
        <div className="form-group">
          <label>Service Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g., Professional Logo Design"
            required
          />
        </div>

        <div className="form-group">
          <label>Service Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-input"
            rows="4"
            placeholder="Describe what you offer..."
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
              placeholder="800"
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
              placeholder="1200"
            />
          </div>
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
              <option value="design">Design & Creative</option>
              <option value="development">Development & IT</option>
              <option value="marketing">Marketing</option>
              <option value="consulting">Consulting</option>
              <option value="writing">Writing & Translation</option>
            </select>
          </div>
          <div className="form-group">
            <label>Delivery Time *</label>
            <input
              type="text"
              name="delivery_time"
              value={formData.delivery_time}
              onChange={handleChange}
              className="form-input"
              placeholder="3 days"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Revisions</label>
            <input
              type="number"
              name="revisions"
              value={formData.revisions}
              onChange={handleChange}
              className="form-input"
              placeholder="2"
            />
          </div>
          <div className="form-group">
            <label>Service Icon</label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="form-input"
              placeholder="🛠️"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Publish Service'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/seller/dashboard/services')}
            className="btn btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>

      <style>{`
        .add-service {
          max-width: 800px;
          margin: 0 auto;
        }
        .add-service h2 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .service-form {
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
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
      `}</style>
    </div>
  );
};

export default AddService;