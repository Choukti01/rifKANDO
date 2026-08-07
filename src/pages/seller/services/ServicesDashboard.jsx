import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, XMarkIcon, ShoppingBagIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { getMyServices, deleteService } from '../../../services/api';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../utils/imageUtils';

const ServicesDashboard = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const handleEndItem = async (id, type) => {
    if (window.confirm('Mark this service as ended? It will no longer appear in marketplace listings.')) {
      try {
        await api.patch(`/${type}/${id}/status`, { status: 'ended' });
        toast.success('Service marked as ended');
        fetchServices();
      } catch {
        toast.error('Failed to update status');
      }
    }
  };

  const handleDelete = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteService(serviceId);
        toast.success('Service deleted successfully');
        fetchServices();
      } catch {
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
        <div className="stat-card"><div className="stat-label">Total Services</div><div className="stat-value">{stats.totalServices}</div><div className="stat-change">{stats.totalServices > 0 ? '+ recently' : 'Add your first service'}</div></div>
        <div className="stat-card"><div className="stat-label">Total Orders</div><div className="stat-value">{stats.totalOrders}</div><div className="stat-change">Completed orders</div></div>
        <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value">{stats.totalRevenue.toLocaleString()} MAD</div><div className="stat-change">From service sales</div></div>
        <div className="stat-card"><div className="stat-label">Average Rating</div><div className="stat-value">{stats.avgRating} ★</div><div className="stat-change">Client satisfaction</div></div>
      </div>

      <div className="services-card">
        <div className="card-header">
          <h3>Your Services</h3>
          <button onClick={handleAddNew} className="btn btn-primary btn-sm"><PlusIcon className="w-4 h-4" />New Service</button>
        </div>

        {services.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🛠️</div><p>No services yet</p><button onClick={handleAddNew} className="btn btn-primary">Create Your First Service</button></div>
        ) : (
          <div className="services-list">
            {services.map(service => {
              const primaryImage = service.media?.find(m => m.is_primary) || service.media?.[0];
              return (
                <div key={service.id} className="service-item">
                  <div className="service-info">
                    <div className="service-image-placeholder">
                      {primaryImage ? (
                       <img src={getImageUrl(primaryImage.media_url)} alt={service.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} />                      ) : (
                        service.image || '🛠️'
                      )}
                    </div>
                    <div className="service-details">
                      <h4>{service.title}</h4>
                      <div className="service-stats">
                        <span><ShoppingBagIcon className="stat-icon" />{service.orders_count || 0} orders</span>
                        <span><ChartBarIcon className="stat-icon" />{service.rating || 0} ★</span>
                        <span>{service.price} MAD</span>
                      </div>
                      <div className="service-status">
                        <span className={`status-badge ${service.status === 'published' ? 'published' : 'ended'}`}>
                          {service.status === 'published' ? 'Active' : 'Ended'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="service-actions">
                    <Link to={`/service/${service.id}`} className="action-btn view" title="View Service" target="_blank"><EyeIcon className="w-4 h-4" /></Link>
                    <Link to={`/seller/dashboard/services/${service.id}/edit`} className="action-btn edit" title="Edit Service"><PencilIcon className="w-4 h-4" /></Link>
                    <Link to={`/seller/dashboard/services/${service.id}/packages`} className="action-btn manage" title="Manage Packages">Manage Packages</Link>
                    {service.status !== 'ended' && (
                      <button onClick={() => handleEndItem(service.id, 'services')} className="action-btn end" title="Mark as Ended">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(service.id)} className="action-btn delete" title="Delete Permanently">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: white; border-radius: 1rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
        .stat-value { font-size: 1.75rem; font-weight: bold; margin-bottom: 0.25rem; }
        .stat-change { font-size: 0.75rem; color: #10b981; }
        .services-card { background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        .card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #e5e7eb; }
        .card-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }
        .empty-state { text-align: center; padding: 3rem; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
        .services-list { padding: 0.5rem; }
        .service-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; gap: 1rem; }
        .service-info { display: flex; align-items: center; gap: 1rem; flex: 1; }
        .service-image-placeholder { width: 60px; height: 60px; background: #f3f4f6; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; overflow: hidden; }
        .service-details h4 { font-size: 1rem; margin-bottom: 0.5rem; }
        .service-stats { display: flex; gap: 1rem; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .stat-icon { width: 0.875rem; height: 0.875rem; margin-right: 0.25rem; }
        .status-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
        .status-badge.published { background: #d1fae5; color: #065f46; }
        .status-badge.ended { background: #fee2e2; color: #991b1b; }
        .service-actions { display: flex; gap: 0.5rem; align-items: center; }

        /* ========== MODERN ACTION BUTTONS ========== */
        .action-buttons, .product-actions, .course-actions, .service-actions, .digital-actions, .booking-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .action-btn {
          position: relative;
          padding: 0;
          width: 36px;
          height: 36px;
          background: transparent;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .action-btn svg {
          width: 18px;
          height: 18px;
          transition: transform 0.2s ease;
          position: relative;
          z-index: 2;
        }

        .action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #f1f5f9;
          border-radius: 12px;
          transform: scale(0.8);
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 1;
        }

        .action-btn:hover::before {
          transform: scale(1);
          opacity: 1;
        }

        .action-btn:hover svg {
          transform: translateY(-2px);
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        /* View button (eye) - Sky Blue */
        .action-btn.view {
          color: #0ea5e9;
        }

        .action-btn.view::before {
          background: #e0f2fe;
        }

        /* Edit button (pencil) - Amber */
        .action-btn.edit {
          color: #f59e0b;
        }

        .action-btn.edit::before {
          background: #fef3c7;
        }

        /* End button (X) - Orange */
        .action-btn.end {
          color: #ea580c;
        }

        .action-btn.end::before {
          background: #ffedd5;
        }

        /* Delete button (trash) - Rose/Red */
        .action-btn.delete {
          color: #e11d48;
        }

        .action-btn.delete::before {
          background: #ffe4e6;
        }

        /* Manage button (for courses/services) - Teal */
        .action-btn.manage {
          color: #0d9488;
          background: #ccfbf1;
          padding: 0.25rem 0.75rem;
          width: auto;
          font-size: 0.75rem;
          font-weight: 500;
          gap: 0.25rem;
        }

        .action-btn.manage svg {
          width: 14px;
          height: 14px;
        }

        .action-btn.manage::before {
          display: none;
        }

        .action-btn.manage:hover {
          background: #99f6e4;
          transform: translateY(-2px);
        }

        /* Tooltip on hover */
        .action-btn {
          position: relative;
        }

        .action-btn::after {
          content: attr(title);
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
          pointer-events: none;
          z-index: 10;
        }

        .action-btn:hover::after {
          opacity: 1;
          visibility: visible;
          bottom: -28px;
        }

        .btn-sm { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-primary { background: #1a1a1a; color: white; }
      `}</style>
    </div>
  );
};

export default ServicesDashboard;
