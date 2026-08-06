import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, XMarkIcon, ArrowDownTrayIcon, ChartBarIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { getMyDigitalProducts, deleteDigitalProduct } from '../../../services/api';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import DigitalRequests from './DigitalRequests';
import { getImageUrl } from '../../../utils/imageUtils';

const DigitalDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDownloads: 0,
    totalRevenue: 0,
    avgRating: 0
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getMyDigitalProducts();
      const productsData = response.data.products || [];
      setProducts(productsData);
      
      const totalDownloads = productsData.reduce((sum, p) => sum + (p.downloads || 0), 0);
      const totalRevenue = productsData.reduce((sum, p) => sum + ((p.price || 0) * (p.downloads || 0)), 0);
      const avgRating = productsData.length > 0 
        ? productsData.reduce((sum, p) => sum + (p.rating || 0), 0) / productsData.length 
        : 0;
      
      setStats({
        totalProducts: productsData.length,
        totalDownloads,
        totalRevenue,
        avgRating: avgRating.toFixed(1)
      });
    } catch (error) {
      console.error('Failed to fetch digital products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleEndItem = async (id, type) => {
    if (window.confirm('Mark this digital product as ended? It will no longer appear in marketplace listings.')) {
      try {
        await api.patch(`/${type}/${id}/status`, { status: 'ended' });
        toast.success('Product marked as ended');
        fetchProducts();
      } catch (error) {
        toast.error('Failed to update status');
      }
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this digital product?')) {
      try {
        await deleteDigitalProduct(productId);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleAddNew = () => {
    navigate('/seller/dashboard/digital/add');
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading digital products...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
          <ArrowDownTrayIcon className="w-4 h-4" /> My Products
        </button>
        <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          <ChatBubbleLeftIcon className="w-4 h-4" /> Buyer Requests
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-label">Total Products</div><div className="stat-value">{stats.totalProducts}</div><div className="stat-change">{stats.totalProducts > 0 ? '+ recently' : 'Add your first product'}</div></div>
            <div className="stat-card"><div className="stat-label">Total Downloads</div><div className="stat-value">{stats.totalDownloads}</div><div className="stat-change">Customer downloads</div></div>
            <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value">{stats.totalRevenue.toLocaleString()} MAD</div><div className="stat-change">From digital sales</div></div>
            <div className="stat-card"><div className="stat-label">Average Rating</div><div className="stat-value">{stats.avgRating} ★</div><div className="stat-change">Customer satisfaction</div></div>
          </div>

          <div className="digital-card">
            <div className="card-header">
              <h3>Your Digital Products</h3>
              <button onClick={handleAddNew} className="btn btn-primary btn-sm"><PlusIcon className="w-4 h-4" />New Product</button>
            </div>

            {products.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💻</div><p>No digital products yet</p><button onClick={handleAddNew} className="btn btn-primary">Add Your First Product</button></div>
            ) : (
              <div className="products-list">
                {products.map(product => {
                  const primaryImage = product.media?.find(m => m.is_primary) || product.media?.[0];
                  return (
                    <div key={product.id} className="product-item">
                      <div className="product-info">
                        <div className="product-image-placeholder">
                          {primaryImage ? (
                            <img src={getImageUrl(primaryImage.media_url)} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} />                          ) : (
                            product.image || '💻'
                          )}
                        </div>
                        <div className="product-details">
                          <h4>{product.title}</h4>
                          <div className="product-stats">
                            <span><ArrowDownTrayIcon className="stat-icon" />{product.downloads || 0} downloads</span>
                            <span><ChartBarIcon className="stat-icon" />{product.rating || 0} ★</span>
                            <span>{product.price} MAD</span>
                          </div>
                          <div className="product-status">
                            <span className={`status-badge ${product.status === 'published' ? 'published' : 'ended'}`}>
                              {product.status === 'published' ? 'Active' : 'Ended'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="product-actions">
                        <Link to={`/digital/${product.id}`} className="action-btn view" title="View Product" target="_blank"><EyeIcon className="w-4 h-4" /></Link>
                        <Link to={`/seller/dashboard/digital/${product.id}/edit`} className="action-btn edit" title="Edit Product"><PencilIcon className="w-4 h-4" /></Link>
                        {product.status !== 'ended' && (
                          <button onClick={() => handleEndItem(product.id, 'digital')} className="action-btn end" title="Mark as Ended">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(product.id)} className="action-btn delete" title="Delete Permanently">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <DigitalRequests />
      )}

      <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: white; border-radius: 1rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
        .stat-value { font-size: 1.75rem; font-weight: bold; margin-bottom: 0.25rem; }
        .stat-change { font-size: 0.75rem; color: #10b981; }
        .digital-card { background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        .card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #e5e7eb; }
        .card-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }
        .empty-state { text-align: center; padding: 3rem; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
        .products-list { padding: 0.5rem; }
        .product-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; gap: 1rem; }
        .product-info { display: flex; align-items: center; gap: 1rem; flex: 1; }
        .product-image-placeholder { width: 60px; height: 60px; background: #f3f4f6; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; overflow: hidden; }
        .product-details h4 { font-size: 1rem; margin-bottom: 0.5rem; }
        .product-stats { display: flex; gap: 1rem; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .stat-icon { width: 0.875rem; height: 0.875rem; margin-right: 0.25rem; }
        .status-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
        .status-badge.published { background: #d1fae5; color: #065f46; }
        .status-badge.ended { background: #fee2e2; color: #991b1b; }
        .product-actions { display: flex; gap: 0.5rem; align-items: center; }

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
        .tabs-container { display: flex; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #6b7280; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab-btn.active { color: #87CEEB; border-bottom-color: #87CEEB; }
        .tab-btn:hover { color: #1a1a1a; }
      `}</style>
    </div>
  );
};

export default DigitalDashboard;
