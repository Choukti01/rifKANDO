import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const OrderDetailsPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrder();
    }
  }, [id, isAuthenticated]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#8b5cf6',
      shipped: '#10b981',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container text-center py-16">
        <p>Order not found</p>
        <Link to="/orders" className="btn btn-primary mt-4">Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="order-details-page">
      <div className="container">
        <div className="order-details-header">
          <h1>Order Details</h1>
          <Link to="/orders" className="back-link">← Back to Orders</Link>
        </div>

        <div className="order-info-card">
          <div className="order-info-row">
            <span className="order-label">Order Number:</span>
            <span className="order-value">{order.order_number}</span>
          </div>
          <div className="order-info-row">
            <span className="order-label">Date:</span>
            <span className="order-value">{new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          <div className="order-info-row">
            <span className="order-label">Status:</span>
            <span className="order-status" style={{ color: getStatusColor(order.status) }}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <div className="order-info-row">
            <span className="order-label">Payment Method:</span>
            <span className="order-value">{order.payment_method === 'cash' ? 'Cash on Delivery' : order.payment_method}</span>
          </div>
          <div className="order-info-row">
            <span className="order-label">Total:</span>
            <span className="order-total">{order.total} MAD</span>
          </div>
        </div>

        <div className="shipping-info-card">
          <h3>Shipping Address</h3>
          {order.shipping_address && (
            <div className="shipping-address">
              <p>{order.shipping_address.fullName}</p>
              <p>{order.shipping_address.address}</p>
              <p>{order.shipping_address.city}, {order.shipping_address.postalCode}</p>
              <p>{order.shipping_address.phone}</p>
              <p>{order.shipping_address.email}</p>
            </div>
          )}
        </div>

        <div className="order-items-card">
          <h3>Order Items</h3>
          <div className="items-table">
            <div className="items-header">
              <span>Product</span>
              <span>Quantity</span>
              <span>Price</span>
              <span>Total</span>
            </div>
            {order.items?.map((item, index) => (
              <div key={index} className="item-row">
                <span>{item.title}</span>
                <span>{item.quantity}</span>
                <span>{item.price} MAD</span>
                <span>{item.price * item.quantity} MAD</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .order-details-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .order-details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .order-details-header h1 {
          font-size: 1.75rem;
          margin: 0;
        }
        .back-link {
          color: #87CEEB;
          text-decoration: none;
        }
        .order-info-card, .shipping-info-card, .order-items-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .order-info-row {
          display: flex;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .order-label {
          width: 150px;
          font-weight: 500;
          color: #374151;
        }
        .order-value {
          color: #6b7280;
        }
        .order-status {
          font-weight: 500;
        }
        .order-total {
          font-weight: 700;
          color: #1a1a1a;
        }
        .shipping-info-card h3, .order-items-card h3 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
        }
        .shipping-address p {
          margin: 0.25rem 0;
          color: #6b7280;
        }
        .items-header, .item-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          padding: 0.75rem 0;
        }
        .items-header {
          font-weight: 600;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }
        .item-row {
          border-bottom: 1px solid #f3f4f6;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default OrderDetailsPage;