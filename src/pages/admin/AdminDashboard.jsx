import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/recent-orders')
      ]);
      setStats(statsRes.data.stats || {});
      setRecentOrders(ordersRes.data.orders || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-16"><div className="spinner"></div><p>Loading dashboard...</p></div>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total Users</div><div className="stat-value">{stats.totalUsers || 0}</div></div>
        <div className="stat-card"><div className="stat-label">Total Products</div><div className="stat-value">{stats.totalProducts || 0}</div></div>
        <div className="stat-card"><div className="stat-label">Total Orders</div><div className="stat-value">{stats.totalOrders || 0}</div></div>
        <div className="stat-card"><div className="stat-label">Revenue</div><div className="stat-value">{stats.totalRevenue?.toLocaleString()} MAD</div></div>
        <div className="stat-card"><div className="stat-label">Pending Orders</div><div className="stat-value">{stats.pendingOrders || 0}</div></div>
        <div className="stat-card"><div className="stat-label">Pending Withdrawals</div><div className="stat-value">{stats.pendingWithdrawals || 0}</div></div>
      </div>

      <div className="recent-orders">
        <h3>Recent Orders</h3>
        <table className="orders-table">
          <thead>
            <tr><th>Order #</th><th>Buyer</th><th>Total</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {recentOrders.map(order => (
              <tr key={order.id}>
                <td>{order.order_number}</td>
                <td>{order.user_name}</td>
                <td>{order.total} MAD</td>
                <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .admin-dashboard { max-width: 1200px; margin: 0 auto; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: white; border-radius: 1rem; padding: 1rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-label { font-size: 0.75rem; color: #6b7280; }
        .stat-value { font-size: 1.5rem; font-weight: bold; }
        .recent-orders { background: white; border-radius: 1rem; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .orders-table { width: 100%; border-collapse: collapse; }
        .orders-table th, .orders-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .status-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 500; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-processing { background: #dbeafe; color: #1e40af; }
        .status-shipped { background: #e0e7ff; color: #3730a3; }
        .status-delivered { background: #d1fae5; color: #065f46; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;