import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, CurrencyDollarIcon, EyeIcon } from '@heroicons/react/24/outline';
import { getMyProducts } from '../../../services/api';
import api from '../../../services/api';
import useAuth from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSkeleton from '../../../components/common/LoadingSkeleton';
import { useTranslation } from 'react-i18next';

const Overview = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalOrderValue: 0,
    totalViews: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    let isCurrent = true;

    const loadDashboardData = async () => {
      try {
        // Courses, services, and digital products are intentionally parked in
        // launch mode. Do not request their disabled APIs from the seller
        // overview or the browser will receive avoidable 503 responses.
        const [productsRes, ordersRes] = await Promise.all([
          getMyProducts().catch(() => ({ data: { products: [] } })),
          api.get('/seller/orders').catch(() => ({ data: { orders: [] } }))
        ]);

        if (!isCurrent) return;

        const products = productsRes.data.products || [];
        const orders = ordersRes.data.orders || [];
        const totalOrderValue = orders
          .filter((order) => !['cancelled', 'refused', 'returned'].includes(order.fulfillment_status || order.status))
          .reduce((sum, order) => sum + Number(order.seller_amount ?? order.seller_total ?? order.total ?? 0), 0);
        const totalViews = products
          .reduce((sum, item) => sum + (item.views || 0), 0);

        setStats({
          totalProducts: products.length,
          totalOrders: orders.length,
          totalOrderValue,
          totalViews
        });
        setRecentOrders(orders.slice(0, 5));
      } catch (error) {
        if (isCurrent) {
          console.error('Failed to fetch dashboard data:', error);
          toast.error(t('sellerOverview.loadFailed'));
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadDashboardData();

    return () => {
      isCurrent = false;
    };
  }, [t]);

  const getStatusColor = (status) => {
    const colors = {
      delivered: '#10b981',
      shipped: '#3b82f6',
      processing: '#f59e0b',
      pending: '#f59e0b',
      pending_confirmation: '#f59e0b',
      confirmed: '#168dd9',
      refused: '#ef4444',
      returned: '#ef4444',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status) => {
    return status ? t(`sellerCod.statuses.${status}`, { defaultValue: status }) : t('sellerOverview.pending');
  };

  if (loading) {
    return <LoadingSkeleton variant="list" count={4} label={t('sellerOverview.loading')} />;
  }

  const mainStats = [
    { label: t('sellerOverview.products'), value: stats.totalProducts, icon: ShoppingBagIcon, color: '#216275' },
  ];

  const overviewStats = [
    { label: t('sellerOverview.orderValue'), value: `${stats.totalOrderValue.toLocaleString(i18n.language)} MAD`, icon: CurrencyDollarIcon, color: '#216275' },
    { label: t('sellerOverview.orders'), value: stats.totalOrders, icon: ShoppingBagIcon, color: '#216275' },
    { label: t('sellerOverview.views'), value: stats.totalViews.toLocaleString(i18n.language), icon: EyeIcon, color: '#216275' },
  ];
  const totalListings = stats.totalProducts;
  const firstListingPath = '/seller/dashboard/products/add';
  const checklist = [
    { label: t('sellerOverview.profile'), done: Boolean(user?.name && user?.phone && user?.city), to: '/seller/dashboard/settings' },
    { label: t('sellerOverview.firstListing'), done: totalListings > 0, to: firstListingPath },
  ];
  const completedSteps = checklist.filter((step) => step.done).length;

  return (
    <div>
      {/* Welcome Section */}
      <div className="welcome-section">
        <h2>{t('sellerOverview.welcome', { name: user?.name?.split(' ')[0] || t('buyer.seller') })}</h2>
        <p>{totalListings ? t('sellerOverview.activeLead') : t('sellerOverview.emptyLead')}</p>
        <Link to={firstListingPath} className="seller-primary-action">
          {totalListings ? t('sellerOverview.manage') : t('sellerOverview.create')}
        </Link>
      </div>

      {completedSteps < checklist.length && (
        <section className="seller-checklist" aria-labelledby="seller-checklist-title">
          <div>
            <p className="seller-checklist-eyebrow">{t('sellerOverview.gettingStarted', { done: completedSteps, total: checklist.length })}</p>
            <h3 id="seller-checklist-title">{t('sellerOverview.setup')}</h3>
            <p>{t('sellerOverview.setupLead')}</p>
          </div>
          <div className="seller-checklist-steps">
            {checklist.map((step) => (
              <Link to={step.to} key={step.label} className={`seller-checklist-step ${step.done ? 'is-complete' : ''}`}>
                <span aria-hidden="true">{step.done ? '✓' : '○'}</span>{step.label}
              </Link>
            ))}
          </div>
        </section>
      )}

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
          <h3>{t('sellerOverview.recentSales')}</h3>
          <Link to="/seller/dashboard/orders" className="view-all">{t('sellerOverview.viewAll')}</Link>
        </div>
        {recentOrders.length === 0 ? (
          <EmptyState title={t('sellerOverview.noSales')} description={t('sellerOverview.noSalesLead')} />
        ) : (
          <div className="orders-table">
            <table>
              <thead>
                <tr>
                  <th>{t('sellerOverview.columns.id')}</th>
                  <th>{t('sellerOverview.columns.customer')}</th>
                  <th>{t('sellerOverview.columns.amount')}</th>
                  <th>{t('sellerOverview.columns.status')}</th>
                  <th>{t('sellerOverview.columns.date')}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.fulfillment_id || order.id}>
                    <td>{order.order_number}</td>
                    <td>{order.buyer_name || order.customer_name || t('sellerOverview.customer')}</td>
                    <td>{Number(order.seller_amount ?? order.seller_total ?? order.total ?? 0).toLocaleString(i18n.language)} MAD</td>
                    <td>
                      <span className="status-badge" style={{ background: `${getStatusColor(order.fulfillment_status || order.status)}20`, color: getStatusColor(order.fulfillment_status || order.status) }}>
                        {getStatusText(order.fulfillment_status || order.status)}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString(i18n.language)}</td>
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
        .seller-primary-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          margin-top: 1rem;
          padding: 0.65rem 1rem;
          border-radius: 0.65rem;
          background: #1a1a1a;
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          text-decoration: none;
        }
        .seller-primary-action:hover { background: #333; }
        .seller-primary-action:focus-visible, .seller-checklist-step:focus-visible, .view-all:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.6); outline-offset: 3px; }
        .seller-checklist {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 1.2fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          background: linear-gradient(135deg, #ffffff, #f0f9ff);
        }
        .seller-checklist-eyebrow { margin-bottom: .25rem; color: #0369a1; font-size: .75rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .seller-checklist h3 { margin-bottom: .5rem; font-size: 1.125rem; }
        .seller-checklist p:last-child { margin-bottom: 0; }
        .seller-checklist-steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; align-content: center; }
        .seller-checklist-step { display: flex; gap: .5rem; align-items: center; padding: .75rem; border: 1px solid #e5e7eb; border-radius: .75rem; background: #fff; color: #374151; font-size: .875rem; transition: transform 150ms ease, border-color 150ms ease; }
        .seller-checklist-step:hover { transform: translateY(-1px); border-color: #87CEEB; }
        .seller-checklist-step span { color: #6b7280; font-weight: 700; }
        .seller-checklist-step.is-complete span { color: #059669; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        @media (max-width: 768px) { .seller-checklist { grid-template-columns: 1fr; } .seller-checklist-steps { grid-template-columns: 1fr; } }
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
          text-align: start;
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
