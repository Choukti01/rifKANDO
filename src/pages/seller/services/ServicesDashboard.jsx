import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { getMyServices, deleteService } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ServicesDashboard = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [stats, setStats] = useState({
    totalServices: 0,
    totalOrders: 0,
    totalRevenue: 0,
    avgRating: 0
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await getMyServices();
      const servicesData = response.data.services || [];
      setServices(servicesData);
      
      const totalOrders = servicesData.reduce((sum, s) => sum + (s.orders_count || 0), 0);
      const totalRevenue = servicesData.reduce((sum, s) => sum + ((s.price || 0) * (s.orders_count || 0)), 0);
      const avgRating = servicesData.length > 0 
        ? servicesData.reduce((sum, s) => sum + (s.rating || 0), 0) / servicesData.length 
        : 0;
      
      setStats({
        totalServices: servicesData.length,
        totalOrders,
        totalRevenue,
        avgRating: avgRating.toFixed(1)
      });
    } catch (error) {
      console.error('Failed to fetch services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteService(serviceId);
        toast.success('Service deleted successfully');
        fetchServices();
      } catch (error) {
        toast.error('Failed to delete service');
      }
    }
  };

  const handleAddNew = () => {
    navigate('/seller/dashboard/services/add');
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading services...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Services</div>
          <div className="stat-value">{stats.totalServices}</div>
          <div className="stat-change">Active listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-change">Completed orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{stats.totalRevenue.toLocaleString()} MAD</div>
          <div className="stat-change">From service sales</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Rating</div>
          <div className="stat-value">{stats.avgRating} ★</div>
          <div className="stat-change">Client satisfaction</div>
        </div>
      </div>

      <div className="services-card">
        <div className="card-header">
          <h3>Your Services</h3>
          <button onClick={handleAddNew} className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            New Service
          </button>
        </div>

        {services.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛠️</div>
            <p>No services yet</p>
            <button onClick={handleAddNew} className="btn btn-primary">
              Create Your First Service
            </button>
          </div>
        ) : (
          <div className="services-list">
            {services.map(service => (
              <div key={service.id} className="service-item">
                <div className="service-info">
                  <div className="service-image-placeholder">
                    {service.image || '🛠️'}
                  </div>
                  <div className="service-details">
                    <h4>{service.title}</h4>
                    <div className="service-stats">
                      <span>
                        <ChatBubbleLeftRightIcon className="stat-icon" />
                        {service.orders_count || 0} orders
                      </span>
                      <span>{service.delivery_time || '3 days'} delivery</span>
                      <span>{service.revisions || 2} revisions</span>
                    </div>
                    <div className="service-price">
                      <span className="current-price">{service.price} MAD</span>
                      {service.old_price && (
                        <span className="old-price">{service.old_price} MAD</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="service-actions">
                  <Link to={`/service/${service.id}`} className="action-btn" target="_blank">
                    <EyeIcon className="w-4 h-4" />
                  </Link>
                  <Link to={`/seller/dashboard/services/${service.id}/edit`} className="action-btn">
                    <PencilIcon className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(service.id)} className="action-btn delete">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }
        .stat-change {
          font-size: 0.75rem;
          color: #10b981;
        }
        .services-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .card-header h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .services-list {
          padding: 0.5rem;
        }
        .service-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .service-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }
        .service-image-placeholder {
          width: 60px;
          height: 60px;
          background: #f3f4f6;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        .service-details h4 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .service-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }
        .stat-icon {
          width: 0.875rem;
          height: 0.875rem;
          margin-right: 0.25rem;
        }
        .service-price {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .current-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .old-price {
          font-size: 0.75rem;
          color: #9ca3af;
          text-decoration: line-through;
        }
        .service-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .action-btn {
          padding: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          border-radius: 0.5rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
        .action-btn:hover {
          background: #f3f4f6;
        }
        .action-btn.delete:hover {
          color: #ef4444;
        }
        .btn-sm {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ServicesDashboard;