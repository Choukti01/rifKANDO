import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const PackagesManager = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState(null);
  const [packages, setPackages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    delivery_time: '',
    revisions: '',
    features: ''
  });

  useEffect(() => {
    let isCurrent = true;

    const loadServiceAndPackages = async () => {
      try {
        const response = await api.get(`/services/${id}`);
        if (!isCurrent) return;

        setService(response.data.service);
        setPackages(response.data.service.packages || []);
      } catch (error) {
        if (isCurrent) {
          console.error('Error fetching service:', error);
          toast.error('Failed to load service');
          navigate('/seller/dashboard/services');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadServiceAndPackages();

    return () => {
      isCurrent = false;
    };
  }, [id, navigate]);

  const fetchServiceAndPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/services/${id}`);
      setService(response.data.service);
      setPackages(response.data.service.packages || []);
    } catch (error) {
      console.error('Error fetching service:', error);
      toast.error('Failed to load service');
      navigate('/seller/dashboard/services');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (pkg = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name || '',
        price: pkg.price || '',
        delivery_time: pkg.delivery_time || '',
        revisions: pkg.revisions || '',
        features: pkg.features || ''
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: '',
        price: '',
        delivery_time: '',
        revisions: '',
        features: ''
      });
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const packageData = {
        ...formData,
        price: parseFloat(formData.price),
        revisions: parseInt(formData.revisions) || 0
      };

      if (editingPackage) {
        await api.put(`/services/${id}/packages/${editingPackage.id}`, packageData);
        toast.success('Package updated successfully');
      } else {
        await api.post(`/services/${id}/packages`, packageData);
        toast.success('Package added successfully');
      }
      setShowModal(false);
      fetchServiceAndPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error(error.response?.data?.error || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (packageId) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      await api.delete(`/services/${id}/packages/${packageId}`);
      toast.success('Package deleted successfully');
      fetchServiceAndPackages();
    } catch {
      toast.error('Failed to delete package');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading packages...</p>
      </div>
    );
  }

  return (
    <div className="packages-manager">
      <div className="packages-header">
        <div>
          <h2>Manage Packages</h2>
          <p className="service-title">{service?.title}</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-add">
          <PlusIcon className="w-4 h-4" /> Add Package
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p>No packages yet</p>
          <button onClick={() => handleOpenModal()} className="btn-primary">Add Your First Package</button>
        </div>
      ) : (
        <div className="packages-grid">
              {packages.map((pkg) => (
            <div key={pkg.id} className="package-card">
              <div className="package-header">
                <h3>{pkg.name}</h3>
                <div className="package-actions">
                  <button onClick={() => handleOpenModal(pkg)} className="icon-btn edit" title="Edit Package">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(pkg.id)} className="icon-btn delete" title="Delete Package">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="package-price">{pkg.price} MAD</div>
              <div className="package-details">
                {pkg.delivery_time && <span>⏱️ Delivery: {pkg.delivery_time}</span>}
                {pkg.revisions > 0 && <span>🔄 {pkg.revisions} revisions</span>}
              </div>
              {pkg.features && (
                <div className="package-features">
                  <p>{pkg.features}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPackage ? 'Edit Package' : 'Add New Package'}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Package Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price (MAD) *</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" required />
                </div>
                <div className="form-group">
                  <label>Delivery Time</label>
                  <input type="text" name="delivery_time" value={formData.delivery_time} onChange={handleChange} className="form-input" placeholder="2 days" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Revisions</label>
                  <input type="number" name="revisions" value={formData.revisions} onChange={handleChange} className="form-input" placeholder="2" />
                </div>
                <div className="form-group">
                  <label>Features / Description</label>
                  <textarea name="features" value={formData.features} onChange={handleChange} className="form-input" rows="3" placeholder="What's included in this package?" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                <button type="submit" disabled={saving} className="btn-save">
                  {saving ? 'Saving...' : (editingPackage ? 'Update Package' : 'Add Package')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .packages-manager {
          max-width: 1000px;
          margin: 0 auto;
        }
        .packages-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .packages-header h2 {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
        }
        .service-title {
          color: #6b7280;
          font-size: 0.875rem;
        }
        .btn-add {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 1rem;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .packages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .package-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        .package-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .package-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .package-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
        }
        .package-actions {
          display: flex;
          gap: 0.5rem;
        }
        .icon-btn {
          padding: 0.25rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          border-radius: 0.375rem;
          display: inline-flex;
          align-items: center;
        }
        .icon-btn:hover {
          background: #f3f4f6;
        }
        .icon-btn.edit:hover {
          color: #f59e0b;
        }
        .icon-btn.delete:hover {
          color: #ef4444;
        }
        .package-price {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .package-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .package-features {
          font-size: 0.75rem;
          color: #4b5563;
          border-top: 1px solid #e5e7eb;
          padding-top: 0.5rem;
          margin-top: 0.5rem;
        }
        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-container {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          max-width: 500px;
          width: 90%;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .modal-header h3 {
          font-size: 1.125rem;
        }
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
        .btn-cancel {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .btn-save {
          padding: 0.5rem 1rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .btn-primary {
          background: #1a1a1a;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default PackagesManager;
