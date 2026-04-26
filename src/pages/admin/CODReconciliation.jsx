import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CODReconciliation = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/admin/cod-orders');
      setOrders(res.data.orders);
    } catch (error) {
      console.error(error);
      alert('Failed to load COD orders');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (orderId) => {
    if (!window.confirm('Confirm that cash has been collected from courier? Seller will be credited immediately.')) return;
    setProcessing(orderId);
    try {
      await api.post(`/admin/cod-orders/${orderId}/confirm`);
      alert('Seller credited successfully');
      fetchOrders(); // refresh
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="text-center py-16">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">COD Reconciliation</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No pending COD orders to reconcile.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.shipping_address ? JSON.parse(order.shipping_address).fullName : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total} MAD</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => confirmPayment(order.id)}
                      disabled={processing === order.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm disabled:opacity-50"
                    >
                      {processing === order.id ? 'Processing...' : 'Confirm & Credit Seller'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CODReconciliation;