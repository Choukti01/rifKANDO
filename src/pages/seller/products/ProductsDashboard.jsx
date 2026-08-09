import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getMyProducts, deleteProduct } from '../../../services/api';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../utils/imageUtils';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSkeleton from '../../../components/common/LoadingSkeleton';

const ProductsDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    totalSold: 0,
    lowStock: 0
  });

  useEffect(() => {
    let isCurrent = true;

    const loadProducts = async () => {
      try {
        const response = await getMyProducts();
        if (!isCurrent) return;

        const productsData = response.data.products || [];
        setProducts(productsData);
        setStats({
          totalProducts: productsData.length,
          totalValue: productsData.reduce((sum, product) => sum + (product.price * product.stock), 0),
          totalSold: productsData.reduce((sum, product) => sum + (product.sold || 0), 0),
          lowStock: productsData.filter((product) => product.stock < 10 && product.stock > 0).length
        });
      } catch (error) {
        if (isCurrent) {
          console.error('Failed to fetch products:', error);
          toast.error('Failed to load products');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadProducts();

    return () => {
      isCurrent = false;
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getMyProducts();
      const productsData = response.data.products || [];
      setProducts(productsData);
      const totalValue = productsData.reduce((sum, p) => sum + (p.price * p.stock), 0);
      const totalSold = productsData.reduce((sum, p) => sum + (p.sold || 0), 0);
      const lowStock = productsData.filter(p => p.stock < 10 && p.stock > 0).length;
      setStats({
        totalProducts: productsData.length,
        totalValue,
        totalSold,
        lowStock
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleEndItem = async (id, type) => {
    if (window.confirm('Mark this product as ended? It will no longer appear in marketplace listings.')) {
      try {
        await api.patch(`/${type}/${id}/status`, { status: 'ended' });
        toast.success('Product marked as ended');
        fetchProducts();
      } catch {
        toast.error('Failed to update status');
      }
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(productId);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleAddNew = () => {
    navigate('/seller/dashboard/products/add');
  };

  // Helper to display condition label
  const getConditionLabel = (condition) => {
    switch (condition) {
      case 'used_as_new': return 'Used as New';
      case 'joutiya': return 'Joutiya';
      default: return 'New';
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="list" count={4} label="Loading your products" />;
  }

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{stats.totalProducts}</div>
          <div className="stat-change">Active listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inventory Value</div>
          <div className="stat-value">{stats.totalValue.toLocaleString()} MAD</div>
          <div className="stat-change">Total stock value</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sold</div>
          <div className="stat-value">{stats.totalSold}</div>
          <div className="stat-change">Units sold</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value">{stats.lowStock}</div>
          <div className="stat-change">Need restock</div>
        </div>
      </div>

      {/* Products Table */}
      <div className="products-card">
        <div className="card-header">
          <h3>Your Products</h3>
          <button onClick={handleAddNew} className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" /> Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <EmptyState
            title="Your shop is ready for its first listing"
            description="Add a product with clear photos and details to start reaching customers."
            action={<button onClick={handleAddNew} className="btn btn-primary">Add your first product</button>}
          />
        ) : (
          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Condition</th>
                  <th>Stock</th>
                  <th>Sold</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-image">
                          {product.media && product.media.length > 0 ? (
                            <img
                              src={getImageUrl(product.media[0].media_url)}
                              alt=""
                              style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '0.5rem' }}
                            />
                          ) : (
                            product.image || '📦'
                          )}
                        </div>
                        <div className="product-name">
                          {product.title}
                          <span className="product-category">{product.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="product-price">{product.price} MAD</td>
                    <td>
                      <span className={`condition-badge ${product.condition || 'new'}`}>
                        {getConditionLabel(product.condition)}
                      </span>
                    </td>
                    <td className={product.stock < 10 ? 'text-warning' : ''}>
                      {product.stock}
                      {product.stock < 5 && <span className="stock-badge low">Low stock!</span>}
                    </td>
                    <td>{product.sold || 0}</td>
                    <td>
                      <span className={`status-badge ${product.status === 'published' ? 'published' : 'ended'}`}>
                        {product.status === 'published' ? 'Active' : 'Ended'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/product/${product.id}`} className="action-btn view" title="View Product" target="_blank">
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                        <Link to={`/seller/dashboard/products/${product.id}/edit`} className="action-btn edit" title="Edit Product">
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                        {product.status !== 'ended' && (
                          <button onClick={() => handleEndItem(product.id, 'products')} className="action-btn end" title="Mark as Ended">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(product.id)} className="action-btn delete" title="Delete Permanently">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          font-size: 1.5rem;
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
        .products-table {
          overflow-x: auto;
        }
        .products-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .products-table th,
        .products-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .products-table th {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }
        .product-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .product-image {
          width: 48px;
          height: 48px;
          background: #f3f4f6;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          overflow: hidden;
        }
        .product-name {
          font-weight: 500;
        }
        .product-category {
          display: block;
          font-size: 0.7rem;
          color: #6b7280;
          font-weight: normal;
        }
        .product-price {
          font-weight: 600;
        }
        .text-warning {
          color: #f59e0b;
        }
        .stock-badge {
          display: inline-block;
          margin-left: 0.5rem;
          padding: 0.125rem 0.375rem;
          background: #fee2e2;
          color: #ef4444;
          border-radius: 0.25rem;
          font-size: 0.7rem;
        }
        .condition-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
        }
        .condition-badge.new {
          background: #d1fae5;
          color: #065f46;
        }
        .condition-badge.used_as_new {
          background: #fef3c7;
          color: #92400e;
        }
        .condition-badge.joutiya {
          background: #ede9fe;
          color: #5b21b6;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
        }
        .status-badge.published {
          background: #d1fae5;
          color: #065f46;
        }
        .status-badge.ended {
          background: #fee2e2;
          color: #991b1b;
        }
        .action-buttons {
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
        .action-btn.view { color: #0ea5e9; }
        .action-btn.view::before { background: #e0f2fe; }
        .action-btn.edit { color: #f59e0b; }
        .action-btn.edit::before { background: #fef3c7; }
        .action-btn.end { color: #ea580c; }
        .action-btn.end::before { background: #ffedd5; }
        .action-btn.delete { color: #e11d48; }
        .action-btn.delete::before { background: #ffe4e6; }
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

export default ProductsDashboard;
