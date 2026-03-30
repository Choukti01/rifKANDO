import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBagIcon, CurrencyDollarIcon, EyeIcon, ChartBarIcon } from '@heroicons/react/24/outline'

const Overview = () => {
  const stats = [
    { label: 'Total Sales', value: '45,230 MAD', change: '+18%', icon: CurrencyDollarIcon, color: '#10b981' },
    { label: 'Total Orders', value: '234', change: '+12%', icon: ShoppingBagIcon, color: '#3b82f6' },
    { label: 'Total Views', value: '12,456', change: '+23%', icon: EyeIcon, color: '#8b5cf6' },
    { label: 'Conversion Rate', value: '3.2%', change: '+0.5%', icon: ChartBarIcon, color: '#f59e0b' },
  ]

  const recentOrders = [
    { id: 'ORD-001', customer: 'Ahmed Benjelloun', amount: 9500, status: 'delivered', date: '2024-03-20' },
    { id: 'ORD-002', customer: 'Fatima Zahra', amount: 890, status: 'pending', date: '2024-03-19' },
    { id: 'ORD-003', customer: 'Mohammed Alawi', amount: 1200, status: 'shipped', date: '2024-03-18' },
  ]

  const getStatusColor = (status) => {
    const colors = { delivered: '#10b981', pending: '#f59e0b', shipped: '#3b82f6' }
    return colors[status] || '#6b7280'
  }

  return (
    <div>
      <div className="stats-grid">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="stat-card">
              <div className="stat-header">
                <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="stat-change">{stat.change}</span>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="recent-orders-card">
        <div className="card-header">
          <h3>Recent Orders</h3>
          <Link to="/seller/dashboard/orders" className="view-all">View All</Link>
        </div>
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customer}</td>
                  <td>{order.amount} MAD</td>
                  <td>
                    <span className="status-badge" style={{ background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.date}</td>
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
        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .stat-icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-change {
          font-size: 0.75rem;
          color: #10b981;
          font-weight: 500;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }
        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }
        .recent-orders-card {
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
        .view-all {
          font-size: 0.875rem;
          color: #87CEEB;
          text-decoration: none;
        }
        .orders-table {
          overflow-x: auto;
        }
        .orders-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .orders-table th,
        .orders-table td {
          padding: 0.875rem 1.25rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .orders-table th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

export default Overview