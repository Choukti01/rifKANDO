import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const OrdersPage = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/orders')
      setOrders(response.data.orders || [])
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#8b5cf6',
      shipped: '#10b981',
      delivered: '#10b981',
      cancelled: '#ef4444'
    }
    return colors[status] || '#6b7280'
  }

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading orders...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="container text-center py-16">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-6">Your order history will appear here</p>
        <Link to="/products" className="btn btn-primary">Start Shopping</Link>
      </div>
    )
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
                  <span className="order-number">{order.order_number}</span>
                  <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <span 
                  className="order-status" 
                  style={{ 
                    background: `${getStatusColor(order.status)}20`, 
                    color: getStatusColor(order.status) 
                  }}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
              <div className="order-body">
                <div className="order-items">{order.item_count} item(s)</div>
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
        .order-number {
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