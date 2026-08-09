import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TruckIcon, CheckCircleIcon, ClockIcon, XCircleIcon, CubeIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';   // 👈 correct path (three levels up)

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    const loadOrders = async () => {
      try {
        const response = await api.get('/seller/orders');
        if (!isCurrent) return;

        if (response.data.success) {
          setOrders(response.data.orders || []);
        } else {
          toast.error('Failed to load orders');
        }
      } catch (error) {
        if (isCurrent) {
          console.error('Fetch orders error:', error);
          toast.error('Failed to load orders');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadOrders();

    return () => {
      isCurrent = false;
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/seller/orders');
      if (response.data.success) {
        setOrders(response.data.orders || []);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status });
      if (response.data.success) {
        toast.success(`Order status updated to ${status}`);
        fetchOrders();
      } else {
        toast.error(response.data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Network error - check if backend is running');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: ClockIcon, text: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
      processing: { icon: CubeIcon, text: 'Processing', color: '#3b82f6', bg: '#dbeafe' },
      shipped: { icon: TruckIcon, text: 'Shipped', color: '#8b5cf6', bg: '#ede9fe' },
      delivered: { icon: CheckCircleIcon, text: 'Delivered', color: '#10b981', bg: '#d1fae5' },
      cancelled: { icon: XCircleIcon, text: 'Cancelled', color: '#ef4444', bg: '#fee2e2' }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#87CEEB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="seller-orders">
      <div className="seller-orders-header">
        <h2>Orders</h2>
        <p className="orders-count">{orders.length} total orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <CubeIcon style={{ width: '3rem', height: '3rem', color: '#d1d5db', marginBottom: '1rem' }} />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                let paymentMethodText = 'Unknown';
                if (order.payment_method === 'cash') paymentMethodText = 'Cash';
                else if (order.payment_method === 'cmi') paymentMethodText = 'Card';
                else if (order.payment_method === 'wallet') paymentMethodText = 'Wallet';
                
                return (
                  <tr key={order.id}>
                    <td className="order-id">
                      <span className="order-number">{order.order_number}</span>
                    </td>
                    <td className="customer-name">{order.buyer_name || 'Customer'}</td>
                    <td className="order-total">{Number(order.seller_total ?? order.total ?? 0).toLocaleString()} MAD</td>
                    <td className="payment-method">
                      <span className="payment-badge">{paymentMethodText}</span>
                    </td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                        <StatusIcon style={{ width: '0.75rem', height: '0.75rem' }} />
                        {statusConfig.text}
                      </span>
                    </td>
                    <td className="order-date">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="order-action">
                      <select 
                        onChange={(e) => updateStatus(order.id, e.target.value)} 
                        value={order.status}
                        disabled={updating === order.id}
                        className="status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .seller-orders { max-width: 1200px; margin: 0 auto; }
        .seller-orders-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .seller-orders-header h2 { font-size: 1.5rem; margin: 0; }
        .orders-count { color: #6b7280; font-size: 0.875rem; background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 2rem; }
        .orders-table-container { background: white; border-radius: 1rem; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .orders-table { width: 100%; border-collapse: collapse; min-width: 700px; }
        .orders-table thead th { text-align: left; padding: 1rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
        .orders-table tbody td { padding: 1rem; font-size: 0.875rem; border-bottom: 1px solid #f3f4f6; }
        .orders-table tbody tr:hover { background: #f9fafb; }
        .order-number { font-weight: 600; font-family: monospace; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; }
        .customer-name { font-weight: 500; }
        .order-total { font-weight: 600; }
        .payment-badge { background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.7rem; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 500; }
        .order-date { color: #6b7280; font-size: 0.75rem; }
        .status-select { padding: 0.375rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.75rem; background: white; cursor: pointer; }
        .status-select:disabled { opacity: 0.5; cursor: not-allowed; }
        .empty-orders { text-align: center; padding: 3rem; background: white; border-radius: 1rem; color: #6b7280; }
      `}</style>
    </div>
  );
};

export default SellerOrders;
