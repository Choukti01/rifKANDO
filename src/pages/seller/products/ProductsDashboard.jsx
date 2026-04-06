import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { getMyProducts, deleteProduct } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProductsDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    totalSold: 0,
    lowStock: 0
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getMyProducts();
      const productsData = response.data.products || [];
      setProducts(productsData);
      
      // Calculate stats
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

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(productId);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleAddNew = () => {
    navigate('/seller/dashboard/products/add');
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

      <div className="products-card">
        <div className="card-header">
          <h3>Your Products</h3>
          <button onClick={handleAddNew} className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No products yet</p>
            <button onClick={handleAddNew} className="btn btn-primary">
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
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
                          {product.image || '📦'}
                        </div>
                        <div className="product-name">
                          {product.title}
                          <span className="product-category">{product.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="product-price">{product.price} MAD</td>
                    <td className={product.stock < 10 ? 'text-warning' : ''}>
                      {product.stock}
                      {product.stock < 5 && <span className="stock-badge low">Low stock!</span>}
                    </td>
                    <td>{product.sold || 0}</td>
                    <td>
                      <span className={`status-badge ${product.status === 'published' ? 'published' : 'draft'}`}>
                        {product.status === 'published' ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/product/${product.id}`} className="action-btn" target="_blank">
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                        <Link to={`/seller/dashboard/products/${product.id}/edit`} className="action-btn">
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(product.id)} className="action-btn delete">
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
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
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
        .status-badge.draft {
          background: #fef3c7;
          color: #92400e;
        }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          padding: 0.375rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          border-radius: 0.375rem;
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

export default ProductsDashboard;