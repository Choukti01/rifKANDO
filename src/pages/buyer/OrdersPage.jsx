import React from 'react'
import { Link } from 'react-router-dom'

const OrdersPage = () => {
  const orders = [
    { id: 'ORD-001', date: '2024-03-20', total: 9500, status: 'delivered', items: 1 },
    { id: 'ORD-002', date: '2024-03-15', total: 890, status: 'shipped', items: 1 },
    { id: 'ORD-003', date: '2024-03-10', total: 1200, status: 'processing', items: 1 },
  ]

  const getStatusColor = (status) => {
    const colors = {
      delivered: '#10b981',
      shipped: '#3b82f6',
      processing: '#f59e0b'
    }
    return colors[status] || '#6b7280'
  }

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <div className="orders-page">
      <div className="container">
        <h1 className="orders-title">My Orders</h1>

        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <span className="order-id">{order.id}</span>
                  <span className="order-date">{order.date}</span>
                </div>
                <span className="order-status" style={{ background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}>
                  {getStatusText(order.status)}
                </span>
              </div>
              <div className="order-body">
                <div className="order-items">{order.items} item(s)</div>
                <div className="order-total">{order.total} MAD</div>
              </div>
              <div className="order-footer">
                <Link to={`/orders/${order.id}`} className="order-link">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .orders-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .orders-title {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 2rem;
        }
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .order-card {
          background: white;
          border-radius: 1rem;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 0.75rem;
        }
        .order-id {
          font-weight: 600;
          color: #1a1a1a;
        }
        .order-date {
          font-size: 0.75rem;
          color: #6b7280;
          margin-left: 1rem;
        }
        .order-status {
          padding: 0.25rem 0.75rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .order-body {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .order-items {
          font-size: 0.875rem;
          color: #6b7280;
        }
        .order-total {
          font-weight: 600;
        }
        .order-footer {
          text-align: right;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }
        .order-link {
          color: #87CEEB;
          text-decoration: none;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}

export default OrdersPage