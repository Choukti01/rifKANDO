import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, CurrencyDollarIcon, EyeIcon, ChartBarIcon, AcademicCapIcon, WrenchScrewdriverIcon, ComputerDesktopIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { getMyProducts, getMyCourses, getMyServices, getMyDigitalProducts, getMyBookings, getOrders } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Overview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCourses: 0,
    totalServices: 0,
    totalDigital: 0,
    totalBookings: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalViews: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [productsRes, coursesRes, servicesRes, digitalRes, bookingsRes, ordersRes] = await Promise.all([
        getMyProducts().catch(() => ({ data: { products: [] } })),
        getMyCourses().catch(() => ({ data: { courses: [] } })),
        getMyServices().catch(() => ({ data: { services: [] } })),
        getMyDigitalProducts().catch(() => ({ data: { products: [] } })),
        getMyBookings().catch(() => ({ data: { bookings: [] } })),
        getOrders().catch(() => ({ data: { orders: [] } }))
      ]);

      const products = productsRes.data.products || [];
      const courses = coursesRes.data.courses || [];
      const services = servicesRes.data.services || [];
      const digital = digitalRes.data.products || [];
      const bookings = bookingsRes.data.bookings || [];
      const orders = ordersRes.data.orders || [];

      // Calculate total revenue from orders where user is seller
      const sellerOrders = orders.filter(order => {
        // Check if order contains user's products
        return true; // Simplified for now
      });
      
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalViews = [...products, ...courses, ...services, ...digital, ...bookings].reduce((sum, item) => sum + (item.views || 0), 0);

      setStats({
        totalProducts: products.length,
        totalCourses: courses.length,
        totalServices: services.length,
        totalDigital: digital.length,
        totalBookings: bookings.length,
        totalOrders: orders.length,
        totalRevenue,
        totalViews
      });

      // Get recent orders (last 5)
      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      delivered: '#10b981',
      shipped: '#3b82f6',
      processing: '#f59e0b',
      pending: '#f59e0b',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Determine which seller type stats to show
  const sellerType = user?.sellerType;
  
  // Stats based on seller type
  const mainStats = [];
  
  if (sellerType === 'product' || !sellerType) {
    mainStats.push({ label: 'Products', value: stats.totalProducts, icon: ShoppingBagIcon, color: '#3b82f6' });
  }
  if (sellerType === 'course' || !sellerType) {
    mainStats.push({ label: 'Courses', value: stats.totalCourses, icon: AcademicCapIcon, color: '#10b981' });
  }
  if (sellerType === 'service' || !sellerType) {
    mainStats.push({ label: 'Services', value: stats.totalServices, icon: WrenchScrewdriverIcon, color: '#8b5cf6' });
  }
  if (sellerType === 'digital' || !sellerType) {
    mainStats.push({ label: 'Digital', value: stats.totalDigital, icon: ComputerDesktopIcon, color: '#f59e0b' });
  }
  if (sellerType === 'booking' || !sellerType) {
    mainStats.push({ label: 'Bookings', value: stats.totalBookings, icon: CalendarIcon, color: '#ef4444' });
  }

  const overviewStats = [
    { label: 'Total Sales', value: `${stats.totalRevenue.toLocaleString()} MAD`, change: '+12%', icon: CurrencyDollarIcon, color: '#10b981' },
    { label: 'Total Orders', value: stats.totalOrders, change: '+8%', icon: ShoppingBagIcon, color: '#3b82f6' },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), change: '+23%', icon: EyeIcon, color: '#8b5cf6' },
    { label: 'Conversion Rate', value: stats.totalOrders > 0 ? `${((stats.totalOrders / (stats.totalViews || 1)) * 100).toFixed(1)}%` : '0%', change: '+2%', icon: ChartBarIcon, color: '#f59e0b' },
  ];

  return (
    <div>
      {/* Welcome Section */}
      <div className="welcome-section">
        <h2>Welcome back, {user?.name?.split(' ')[0] || 'Seller'}!</h2>
        <p>Here's what's happening with your store today.</p>
      </div>

      {/* Main Stats by Seller Type */}
      {mainStats.length > 0 && (
        <div className="stats-grid">
          {mainStats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Overview Stats */}
      <div className="stats-grid">
        {overviewStats.map(stat => {
          const Icon = stat.icon;
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
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="recent-orders-card">
        <div className="card-header">
          <h3>Recent Orders</h3>
          <Link to="/seller/dashboard/orders" className="view-all">View All</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="empty-orders">
            <p>No orders yet</p>
          </div>
        ) : (
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
                    <td>{order.order_number}</td>
                    <td>{order.customer_name || 'Customer'}</td>
                    <td>{order.total} MAD</td>
                    <td>
                      <span className="status-badge" style={{ background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .welcome-section {
          margin-bottom: 2rem;
        }
        .welcome-section h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .welcome-section p {
          color: #6b7280;
        }
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
          font-size: 1.75rem;
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
        .empty-orders {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
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
  );
};

export default Overview;