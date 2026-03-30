import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline'

const ProductsDashboard = () => {
  const [products] = useState([
    { id: 1, name: 'iPhone 13 Pro', price: 9500, stock: 15, sold: 23, status: 'active', image: '📱' },
    { id: 2, name: 'Nike Air Max', price: 890, stock: 45, sold: 67, status: 'active', image: '👟' },
    { id: 3, name: 'Moroccan Leather Bag', price: 1200, stock: 8, sold: 12, status: 'low-stock', image: '👜' },
  ])

  const stats = [
    { label: 'Total Products', value: '45', change: '+12%' },
    { label: 'Active Listings', value: '38', change: '+5%' },
    { label: 'Total Sales', value: '234', change: '+23%' },
    { label: 'Revenue', value: '45,230 MAD', change: '+18%' },
  ]

  return (
    <div>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-change">{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="products-card">
        <div className="card-header">
          <h3>Your Products</h3>
          <Link to="/seller/dashboard/products/add" className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            Add New
          </Link>
        </div>
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
                      <span className="product-image">{product.image}</span>
                      <span className="product-name">{product.name}</span>
                    </div>
                  </td>
                  <td>{product.price} MAD</td>
                  <td className={product.stock < 10 ? 'text-warning' : ''}>{product.stock}</td>
                  <td>{product.sold}</td>
                  <td>
                    <span className={`status-badge ${product.status}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn"><EyeIcon className="w-4 h-4" /></button>
                      <button className="action-btn"><PencilIcon className="w-4 h-4" /></button>
                      <button className="action-btn delete"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        }
        .product-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .product-image {
          font-size: 2rem;
        }
        .product-name {
          font-weight: 500;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
        }
        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
        }
        .status-badge.low-stock {
          background: #fef3c7;
          color: #92400e;
        }
        .text-warning {
          color: #f59e0b;
        }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          padding: 0.25rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          border-radius: 0.25rem;
        }
        .action-btn:hover {
          background: #f3f4f6;
        }
        .action-btn.delete:hover {
          color: #ef4444;
        }
        .btn-sm {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  )
}

export default ProductsDashboard