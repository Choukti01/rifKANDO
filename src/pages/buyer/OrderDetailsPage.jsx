import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { 
  TruckIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  CreditCardIcon, 
  BanknotesIcon, 
  WalletIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

const OrderDetailsPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCurrent = true;

    const loadOrder = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        if (isCurrent) setOrder(response.data.order);
      } catch (error) {
        if (isCurrent) {
          console.error('Failed to fetch order:', error);
          toast.error('Failed to load order details');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadOrder();

    return () => {
      isCurrent = false;
    };
  }, [id, isAuthenticated]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }
    setCancelling(true);
    try {
      await api.post(`/orders/${order.id}/cancel`);
      toast.success('Order cancelled successfully');
      await fetchOrder();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusSteps = (currentStatus) => {
    const steps = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = steps.indexOf(currentStatus);
    return steps.map((step, index) => ({
      name: step,
      completed: index <= currentIndex,
      active: index === currentIndex,
      label: step.charAt(0).toUpperCase() + step.slice(1)
    }));
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash': return <BanknotesIcon style={{ width: '1rem', height: '1rem' }} />;
      case 'cmi': return <CreditCardIcon style={{ width: '1rem', height: '1rem' }} />;
      case 'wallet': return <WalletIcon style={{ width: '1rem', height: '1rem' }} />;
      default: return <BanknotesIcon style={{ width: '1rem', height: '1rem' }} />;
    }
  };

  const getPaymentText = (method) => {
    switch (method) {
      case 'cash': return 'Cash on Delivery';
      case 'cmi': return 'Credit Card (CMI)';
      case 'wallet': return 'Wallet Balance';
      default: return method || 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#87CEEB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container text-center py-16">
        <p>Order not found</p>
        <Link to="/orders" className="back-link">Back to Orders</Link>
      </div>
    );
  }

  const statusSteps = getStatusSteps(order.status);
  const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || order.total;

  return (
    <div className="order-details-page">
      <div className="container">
        <div className="order-details-header">
          <h1>Order Details</h1>
          <Link to="/orders" className="back-link">← Back to Orders</Link>
        </div>

        {/* Order Tracking Timeline */}
        <div className="tracking-card">
          <h3>Order Tracking</h3>
          <div className="tracking-steps">
            {statusSteps.map((step, idx) => (
              <div key={step.name} className={`tracking-step ${step.completed ? 'completed' : ''} ${step.active ? 'active' : ''}`}>
                <div className="step-dot"></div>
                <div className="step-label">{step.label}</div>
                {idx < statusSteps.length - 1 && <div className="step-line"></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="details-grid">
          {/* Order Info */}
          <div className="info-card">
            <h3>Order Information</h3>
            <div className="info-row">
              <span className="info-label">Order Number:</span>
              <span className="info-value">{order.order_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Date:</span>
              <span className="info-value">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value status-text">{order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Payment Method:</span>
              <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {getPaymentIcon(order.payment_method)}
                {getPaymentText(order.payment_method)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Payment Status:</span>
              <span className={`payment-status ${order.payment_status}`}>{order.payment_status === 'paid' ? '✓ Paid' : 'Pending'}</span>
            </div>
            {/* Cancel button - only for pending orders */}
            {order.status === 'pending' && (
              <div className="info-row">
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="cancel-btn"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="info-card">
            <h3>Shipping Address</h3>
            {order.shipping_address ? (
              <div className="shipping-address">
                <p><strong>{order.shipping_address.fullName || 'N/A'}</strong></p>
                <p>{order.shipping_address.address || 'N/A'}</p>
                <p>{order.shipping_address.city || 'N/A'}, {order.shipping_address.postalCode || ''}</p>
                <p><PhoneIcon style={{ width: '0.875rem', display: 'inline', marginRight: '0.5rem' }} />{order.shipping_address.phone || 'N/A'}</p>
                <p><EnvelopeIcon style={{ width: '0.875rem', display: 'inline', marginRight: '0.5rem' }} />{order.shipping_address.email || 'N/A'}</p>
              </div>
            ) : (
              <p className="no-address">No shipping address provided</p>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="items-card">
          <h3>Order Items</h3>
          
          {!order.items || order.items.length === 0 ? (
            <p className="no-items">No items found for this order.</p>
          ) : (
            <>
              <div className="items-table-wrapper">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index}>
                        <td className="item-title">{item.title || item.product_title || 'Product'}</td>
                        <td className="item-quantity">{item.quantity}</td>
                        <td className="item-price">{item.price} MAD</td>
                        <td className="item-total">{item.price * item.quantity} MAD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{subtotal} MAD</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span>{order.total} MAD</span>
                </div>
              </div>
            </>
          )}
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
          font-size: 0.875rem; 
        }
        
        .back-link:hover { 
          text-decoration: underline; 
        }
        
        /* Tracking Card */
        .tracking-card { 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(8px); 
          border-radius: 1rem; 
          padding: 1.5rem; 
          margin-bottom: 1.5rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .tracking-card h3 { 
          font-size: 1rem; 
          margin-bottom: 1.5rem; 
          font-weight: 600;
        }
        
        .tracking-steps { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          position: relative; 
        }
        
        .tracking-step { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          position: relative; 
        }
        
        .step-dot { 
          width: 12px; 
          height: 12px; 
          border-radius: 50%; 
          background: #e5e7eb; 
          transition: all 0.3s; 
          z-index: 2; 
        }
        
        .tracking-step.completed .step-dot { 
          background: #10b981; 
        }
        
        .tracking-step.active .step-dot { 
          background: #87CEEB; 
          width: 16px; 
          height: 16px; 
          box-shadow: 0 0 0 3px rgba(135,206,235,0.3); 
        }
        
        .step-label { 
          font-size: 0.7rem; 
          margin-top: 0.5rem; 
          color: #6b7280; 
          text-transform: uppercase; 
          font-weight: 500; 
        }
        
        .tracking-step.completed .step-label, 
        .tracking-step.active .step-label { 
          color: #1a1a1a; 
        }
        
        .step-line { 
          position: absolute; 
          top: 6px; 
          left: 50%; 
          width: 100%; 
          height: 2px; 
          background: #e5e7eb; 
          z-index: 1; 
        }
        
        .tracking-step.completed ~ .tracking-step .step-line { 
          background: #10b981; 
        }
        
        /* Details Grid */
        .details-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 1.5rem; 
          margin-bottom: 1.5rem; 
        }
        
        @media (max-width: 768px) { 
          .details-grid { 
            grid-template-columns: 1fr; 
          } 
        }
        
        /* Info Cards */
        .info-card { 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(8px); 
          border-radius: 1rem; 
          padding: 1.5rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .info-card h3 { 
          font-size: 1rem; 
          margin-bottom: 1rem; 
          font-weight: 600;
        }
        
        .info-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 0.5rem 0; 
          border-bottom: 1px solid #e5e7eb; 
          flex-wrap: wrap;
          align-items: center;
        }
        
        .info-row:last-child { 
          border-bottom: none; 
        }
        
        .info-label { 
          font-weight: 500; 
          color: #374151; 
        }
        
        .info-value { 
          color: #6b7280; 
        }
        
        .payment-status { 
          padding: 0.25rem 0.75rem; 
          border-radius: 2rem; 
          font-size: 0.75rem; 
          font-weight: 500; 
        }
        
        .payment-status.paid { 
          background: #d1fae5; 
          color: #10b981; 
        }
        
        .payment-status.pending { 
          background: #fef3c7; 
          color: #f59e0b; 
        }
        
        /* Cancel button */
        .cancel-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
          width: 100%;
        }
        .cancel-btn:hover {
          background: #dc2626;
        }
        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Shipping Address */
        .shipping-address p { 
          margin: 0.5rem 0; 
          color: #6b7280; 
          font-size: 0.875rem; 
          display: flex; 
          align-items: center; 
        }
        
        .shipping-address strong { 
          color: #1a1a1a; 
        }
        
        /* Items Card */
        .items-card { 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(8px); 
          border-radius: 1rem; 
          padding: 1.5rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .items-card h3 { 
          font-size: 1rem; 
          margin-bottom: 1rem; 
          font-weight: 600;
        }
        
        .items-table-wrapper {
          overflow-x: auto;
          margin-bottom: 1.5rem;
        }
        
        .items-table { 
          width: 100%; 
          border-collapse: collapse; 
        }
        
        .items-table th { 
          text-align: left; 
          padding: 0.75rem 0.5rem; 
          font-size: 0.75rem; 
          font-weight: 600; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          color: #6b7280; 
          border-bottom: 1px solid #e5e7eb; 
        }
        
        .items-table td { 
          padding: 0.75rem 0.5rem; 
          font-size: 0.875rem; 
          border-bottom: 1px solid #f3f4f6; 
        }
        
        .items-table tr:last-child td { 
          border-bottom: none; 
        }
        
        .item-title { 
          font-weight: 500; 
          color: #1a1a1a; 
        }
        
        .item-quantity { 
          color: #6b7280; 
        }
        
        .item-price { 
          color: #6b7280; 
        }
        
        .item-total { 
          font-weight: 600; 
          color: #1a1a1a; 
        }
        
        /* Order Summary */
        .order-summary { 
          margin-top: 1rem; 
          padding-top: 1rem; 
          border-top: 1px solid #e5e7eb; 
          text-align: right; 
        }
        
        .summary-row { 
          display: flex; 
          justify-content: flex-end; 
          gap: 2rem; 
          padding: 0.25rem 0; 
          font-size: 0.875rem; 
          color: #6b7280; 
        }
        
        .summary-total { 
          display: flex; 
          justify-content: flex-end; 
          gap: 2rem; 
          padding-top: 0.5rem; 
          font-weight: 700; 
          font-size: 1rem; 
          border-top: 1px solid #e5e7eb; 
          margin-top: 0.5rem; 
          color: #1a1a1a;
        }
        
        .no-items {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default OrderDetailsPage;
