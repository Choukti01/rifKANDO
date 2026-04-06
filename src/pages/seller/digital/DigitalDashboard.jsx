import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { getMyDigitalProducts, deleteDigitalProduct } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const DigitalDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
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
      console.log('My digital products:', response.data);
      const productsData = response.data.products || [];
      setProducts(productsData);
      
      const totalSales = productsData.reduce((sum, p) => sum + (p.sales_count || 0), 0);
      const totalRevenue = productsData.reduce((sum, p) => sum + ((p.price || 0) * (p.sales_count || 0)), 0);
      const avgRating = productsData.length > 0 
        ? productsData.reduce((sum, p) => sum + (p.rating || 0), 0) / productsData.length 
        : 0;
      
      setStats({
        totalProducts: productsData.length,
        totalSales,
        totalRevenue,
        avgRating: avgRating.toFixed(1)
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
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
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{stats.totalProducts}</div>
          <div className="stat-change">Active listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sales</div>
          <div className="stat-value">{stats.totalSales}</div>
          <div className="stat-change">Downloads</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{stats.totalRevenue.toLocaleString()} MAD</div>
          <div className="stat-change">From digital sales</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Rating</div>
          <div className="stat-value">{stats.avgRating} ★</div>
          <div className="stat-change">Customer satisfaction</div>
        </div>
      </div>

      <div className="products-card">
        <div className="card-header">
          <h3>Your Digital Products</h3>
          <button onClick={handleAddNew} className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💻</div>
            <p>No digital products yet</p>
            <button onClick={handleAddNew} className="btn btn-primary">
              Create Your First Product
            </button>
          </div>
        ) : (
          <div className="products-list">
            {products.map(product => (
              <div key={product.id} className="product-item">
                <div className="product-info">
                  <div className="product-image-placeholder">
                    {product.image || '💻'}
                  </div>
                  <div className="product-details">
                    <h4>{product.title}</h4>
                    <div className="product-stats">
                      <span>
                        <CloudArrowDownIcon className="stat-icon" />
                        {product.sales_count || 0} sales
                      </span>
                      <span>{product.price} MAD</span>
                      <span>{product.category || 'Digital'}</span>
                    </div>
                  </div>
                </div>
                <div className="product-actions">
                  <Link to={`/digital/${product.id}`} className="action-btn" target="_blank">
                    <EyeIcon className="w-4 h-4" />
                  </Link>
                  <Link to={`/seller/dashboard/digital/${product.id}/edit`} className="action-btn">
                    <PencilIcon className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(product.id)} className="action-btn delete">
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
        .products-card {
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
        .products-list {
          padding: 0.5rem;
        }
        .product-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .product-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }
        .product-image-placeholder {
          width: 60px;
          height: 60px;
          background: #f3f4f6;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        .product-details h4 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .product-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #6b7280;
          flex-wrap: wrap;
        }
        .stat-icon {
          width: 0.875rem;
          height: 0.875rem;
          margin-right: 0.25rem;
        }
        .product-actions {
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
        .btn-primary {
          background: #1a1a1a;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default DigitalDashboard;