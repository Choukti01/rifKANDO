import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, ShoppingBagIcon, AcademicCapIcon,
  WrenchScrewdriverIcon, CurrencyDollarIcon, Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon, ComputerDesktopIcon, MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon, Bars3Icon, XMarkIcon, ClipboardDocumentListIcon,
  HeartIcon, ShoppingCartIcon, TagIcon, ShieldExclamationIcon, PlusIcon
} from '@heroicons/react/24/outline';
import useAuth from '../../../hooks/useAuth';
import useCart from '../../../hooks/useCart';
import useFavorites from '../../../hooks/useFavorites';
import { getImageUrl } from '../../../utils/imageUtils';
import api from '../../../services/api';
import { useTranslation } from 'react-i18next';

const DashboardLayout = () => {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { favoritesCount } = useFavorites();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/messages/unread-count');
        setUnreadCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const sellerWorkspaceItems = {
    product: { name: t('sellerDashboard.products'), icon: ShoppingBagIcon, path: 'products' },
    course: { name: t('sellerDashboard.courses'), icon: AcademicCapIcon, path: 'courses' },
    service: { name: t('sellerDashboard.services'), icon: WrenchScrewdriverIcon, path: 'services' },
    digital: { name: t('sellerDashboard.digital'), icon: ComputerDesktopIcon, path: 'digital' },
  };
  // A seller can keep products as their primary workspace and also offer
  // professional services. Courses and digital remain intentionally parked.
  const selectedWorkspaceItems = [
    ...(user?.sellerType === 'product' || !user?.sellerType ? [sellerWorkspaceItems.product] : []),
    sellerWorkspaceItems.course,
    sellerWorkspaceItems.service,
  ];
  const workspaceItems = [
    { name: t('sellerDashboard.overview'), icon: HomeIcon, path: 'overview' },
    ...selectedWorkspaceItems,
    { name: t('sellerDashboard.findit'), icon: MagnifyingGlassIcon, path: 'findit' },
    { name: t('sellerDashboard.offers'), icon: TagIcon, path: 'offers' },
  ];
  const operationsItems = [
    { name: t('sellerDashboard.orders'), icon: ClipboardDocumentListIcon, path: 'orders' },
    { name: t('sellerDashboard.disputes'), icon: ShieldExclamationIcon, path: 'disputes' },
    { name: t('sellerDashboard.messages'), icon: ChatBubbleLeftRightIcon, path: 'messages', unreadCount },
  ];
  const accountItems = [
    { name: t('sellerDashboard.wallet'), icon: CurrencyDollarIcon, path: 'wallet' },
    { name: t('sellerDashboard.settings'), icon: Cog6ToothIcon, path: 'settings' },
  ];
  const buyingItems = [
    { name: t('sellerDashboard.savedItems'), icon: HeartIcon, path: 'favorites', count: favoritesCount },
    { name: t('sellerDashboard.cart'), icon: ShoppingCartIcon, path: 'cart', count: cartCount },
  ];
  const navGroups = [
    { name: t('sellerDashboard.workspace'), items: workspaceItems },
    { name: t('sellerDashboard.operations'), items: operationsItems },
    { name: t('sellerDashboard.account'), items: accountItems },
    { name: t('sellerDashboard.buying'), items: buyingItems },
  ];
  const navItems = navGroups.flatMap((group) => group.items);
  const activeSection = navItems.find(({ path }) =>
    location.pathname.startsWith(`/seller/dashboard/${path}`)
  )?.name || t('sellerDashboard.title');
  const canCreateProduct = user?.sellerType === 'product' || !user?.sellerType;
  const isServiceWorkspace = location.pathname.startsWith('/seller/dashboard/services');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleWorkspaceMenu = () => setIsWorkspaceMenuOpen((isOpen) => !isOpen);
  const closeWorkspaceMenu = () => setIsWorkspaceMenuOpen(false);

  return (
    <div className="dashboard-container dashboard-container--top-menu">
      <header className="seller-workspace-topbar">
        <div className="seller-workspace-heading">
          <span>{t('sellerDashboard.title')}</span>
          <h1>{activeSection}</h1>
        </div>
        <div className="seller-workspace-actions">
          {isServiceWorkspace ? (
            <Link to="/seller/dashboard/services/add" className="seller-workspace-primary-action">
              <PlusIcon aria-hidden="true" />
              <span>{t('sellerDashboard.services')}</span>
            </Link>
          ) : canCreateProduct && (
            <Link to="products/add" className="seller-workspace-primary-action">
              <PlusIcon aria-hidden="true" />
              <span>{t('sellerProducts.add')}</span>
            </Link>
          )}
          <button
            type="button"
            className={`seller-workspace-menu-toggle ${isWorkspaceMenuOpen ? 'is-open' : ''}`}
            onClick={toggleWorkspaceMenu}
            aria-label={isWorkspaceMenuOpen ? t('sellerDashboard.close') : t('sellerDashboard.open')}
            aria-controls="seller-workspace-navigation"
            aria-expanded={isWorkspaceMenuOpen}
          >
            {isWorkspaceMenuOpen ? <XMarkIcon aria-hidden="true" /> : <Bars3Icon aria-hidden="true" />}
            <span>{isWorkspaceMenuOpen ? t('sellerDashboard.close') : t('sellerDashboard.open')}</span>
          </button>
        </div>
      </header>

      <section
        id="seller-workspace-navigation"
        className={`seller-workspace-menu ${isWorkspaceMenuOpen ? 'is-open' : ''}`}
        aria-label={t('sellerDashboard.title')}
      >
        <div className="seller-workspace-menu-inner">
          <div className="seller-workspace-menu-panel">
            <div className="seller-workspace-user">
              <div className="sidebar-avatar">
            {user?.profilePicture ? (
              <img
                src={getImageUrl(user.profilePicture)}
                alt={user?.name}
                className="sidebar-avatar-img"
              />
            ) : (
              <span>{user?.name?.charAt(0) || t('sellerDashboard.seller').charAt(0)}</span>
            )}
              </div>
              <div className="seller-workspace-user-info">
              <h4>{user?.name || t('sellerDashboard.seller')}</h4>
              <p>{user?.sellerType === 'product' ? t('sellerDashboard.productSeller') :
                     user?.sellerType === 'course' ? t('sellerDashboard.courseInstructor') :
                     user?.sellerType === 'service' ? t('sellerDashboard.serviceProvider') :
                     user?.sellerType === 'digital' ? t('sellerDashboard.digitalCreator') : t('sellerDashboard.seller')}</p>
              </div>
              <button type="button" onClick={handleLogout} className="seller-workspace-logout">
                <ArrowLeftOnRectangleIcon aria-hidden="true" />
                <span>{t('sellerDashboard.exit')}</span>
              </button>
            </div>

            <nav className="seller-workspace-nav">
              {navGroups.map((group) => (
                <section className="seller-workspace-nav-group" key={group.name}>
                  <p className="seller-workspace-section-label">{group.name}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) => `seller-workspace-nav-link ${isActive ? 'active' : ''}`}
                    onClick={closeWorkspaceMenu}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.name}</span>
                    {item.unreadCount > 0 && <span className="seller-workspace-count">{item.unreadCount}</span>}
                    {item.count > 0 && <span className="seller-workspace-count">{item.count}</span>}
                  </NavLink>
                );
              })}
                </section>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>

      <style>{`
        .dashboard-container {
          min-height: calc(100dvh - var(--navbar-height, 80px));
          background: #f6f8fb;
          display: block;
          position: relative;
          isolation: isolate;
        }

        /* Mobile header (visible only on small screens) */
        .mobile-dashboard-header {
          display: none;
          position: fixed;
          top: var(--navbar-height, 80px);
          left: 0;
          right: 0;
          min-height: 64px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: 0.6rem 1rem;
          border-bottom: 1px solid rgba(17, 24, 39, 0.08);
          align-items: center;
          justify-content: space-between;
          z-index: 45;
        }
        .mobile-dashboard-header h1 {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .mobile-dashboard-title span {
          display: block;
          margin-bottom: 0.1rem;
          color: #6b7280;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .mobile-menu-btn {
          width: 40px;
          height: 40px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
        }
        .mobile-menu-btn .icon {
          width: 1.5rem;
          height: 1.5rem;
        }
        .placeholder {
          width: 2.5rem;
        }

        /* Overlay for mobile */
        .mobile-overlay {
          position: fixed;
          top: var(--navbar-height, 80px);
          left: 0;
          width: 100%;
          height: calc(100dvh - var(--navbar-height, 80px));
          background: rgba(0, 0, 0, 0.5);
          z-index: 50;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        .mobile-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        /* Sidebar modifications */
        .dashboard-sidebar {
          position: fixed;
          top: var(--navbar-height, 80px);
          bottom: 0;
          height: auto;
          background: white;
          border-right: 1px solid #e5e7eb;
          box-shadow: 10px 0 28px rgba(15, 23, 42, 0.035);
          transition: width 0.3s ease, transform 0.3s ease;
          z-index: 40;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .dashboard-sidebar.open {
          width: 280px;
        }
        .dashboard-sidebar.closed {
          width: 80px;
        }

        /* Mobile sidebar behaviour */
        @media (max-width: 768px) {
          .dashboard-sidebar {
            top: var(--navbar-height, 64px);
            bottom: 0;
            position: fixed;
            transform: translateX(-100%);
            width: 280px !important;
            border-radius: 0 18px 18px 0;
            border-right: 0;
            box-shadow: 14px 0 38px rgba(15, 23, 42, 0.22);
            height: auto;
            z-index: 60;
          }
          .dashboard-sidebar.mobile-open {
            transform: translateX(0);
          }
          .dashboard-sidebar.closed {
            width: 280px !important;
          }
          .mobile-dashboard-header {
            display: flex;
          }
          .dashboard-header.desktop-only {
            display: none;
          }
          .dashboard-container {
            display: block;
            min-height: calc(100dvh - var(--navbar-height, 64px));
            padding-top: 64px;
          }
          .dashboard-main {
            margin-left: 0 !important;
            padding: 1rem;
          }
          .sidebar-toggle {
            display: none;
          }
          .mobile-close-btn {
            display: block;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            color: #6b7280;
          }
          .mobile-close-btn .icon {
            width: 1.25rem;
            height: 1.25rem;
          }
        }

        @media (min-width: 769px) {
          .mobile-close-btn {
            display: none;
          }
        }

        .sidebar-header {
          min-height: 68px;
          padding: 0.9rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          flex-shrink: 0;
        }
        .sidebar-toggle {
          width: 36px;
          height: 36px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #ffffff;
          cursor: pointer;
          font-size: 1rem;
          color: #6b7280;
        }
        .sidebar-user {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .sidebar-avatar {
          width: 40px;
          height: 40px;
          background: #87CEEB;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1rem;
          overflow: hidden;
          flex-shrink: 0;
        }
        .sidebar-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sidebar-user-info h4 {
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        .sidebar-user-info p {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .sidebar-nav {
          flex: 1;
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #e5e7eb transparent;
        }
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 4px;
        }
        .sidebar-nav:hover::-webkit-scrollbar-thumb {
          background: #d1d5db;
        }
        .sidebar-nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 0.75rem;
          color: #4b5563;
          text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .sidebar-nav-link:hover {
          background: #f3f4f6;
        }
        .sidebar-nav-link.active {
          background: #87CEEB;
          color: #1a1a1a;
        }
        .sidebar-section-label {
          margin: 1rem 0 0.35rem;
          padding: 0 0.75rem;
          color: #6b7280;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }
        .sidebar-unread-badge {
          margin-left: auto;
          min-width: 1.25rem;
          padding: 0.1rem 0.35rem;
          border-radius: 999px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          text-align: center;
        }
        .sidebar-nav-icon {
          width: 1.25rem;
          height: 1.25rem;
          flex-shrink: 0;
        }
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          flex-shrink: 0;
        }
        .sidebar-logout {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem;
          background: none;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          color: #ef4444;
          white-space: nowrap;
        }
        .sidebar-logout:hover {
          background: #fee2e2;
        }
        .dashboard-sidebar.closed .sidebar-user,
        .dashboard-sidebar.closed .sidebar-nav-link,
        .dashboard-sidebar.closed .sidebar-logout {
          justify-content: center;
        }
        .dashboard-sidebar.closed .sidebar-section-label {
          display: none;
        }
        .dashboard-sidebar.closed .sidebar-unread-badge {
          display: none;
        }
        .dashboard-main {
          min-height: calc(100dvh - var(--navbar-height, 80px));
          min-width: 0;
          padding: 1.5rem clamp(1rem, 2.5vw, 2rem) 2.5rem;
          transition: margin-left 0.3s ease;
        }
        .dashboard-main.with-sidebar {
          margin-left: 280px;
        }
        .dashboard-main.without-sidebar {
          margin-left: 80px;
        }
        @media (max-width: 768px) {
          .dashboard-main.with-sidebar,
          .dashboard-main.without-sidebar {
            margin-left: 0;
          }
          .dashboard-main {
            min-height: calc(100dvh - 144px);
            padding: 1rem;
          }
        }
      `}</style>
      <style>{`
        .dashboard-container {
          --seller-ink: #071b35;
          --seller-muted: #64748b;
          --seller-blue: #0877bf;
          --seller-blue-strong: #0665a6;
          --seller-sky: #eaf7ff;
          background:
            radial-gradient(circle at 82% -8%, rgba(99, 184, 243, 0.18), transparent 28rem),
            linear-gradient(180deg, #f8fbff 0%, #f4f8fc 100%);
        }

        .dashboard-sidebar {
          inset-inline-start: 0;
          left: auto;
          border-inline-end: 1px solid rgba(8, 119, 191, 0.1);
          border-right: 0;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 14px 0 38px rgba(7, 27, 53, 0.07);
        }

        .sidebar-header {
          min-height: 76px;
          padding: 0.9rem 1rem;
          justify-content: space-between;
          border-bottom-color: rgba(8, 119, 191, 0.1);
        }

        .sidebar-brand-lockup {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          color: var(--seller-ink);
        }

        .sidebar-brand-lockup > div {
          min-width: 0;
        }

        .sidebar-brand-lockup strong,
        .sidebar-brand-lockup small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sidebar-brand-lockup strong {
          font-size: 0.98rem;
          font-weight: 850;
          letter-spacing: -0.035em;
        }

        .sidebar-brand-lockup small {
          margin-top: 0.1rem;
          color: var(--seller-muted);
          font-size: 0.62rem;
          font-weight: 750;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .sidebar-toggle,
        .mobile-menu-btn {
          border-color: rgba(8, 119, 191, 0.16);
          color: var(--seller-blue);
          box-shadow: 0 4px 12px rgba(8, 119, 191, 0.08);
        }

        .sidebar-toggle:hover,
        .mobile-menu-btn:hover {
          border-color: rgba(8, 119, 191, 0.34);
          background: var(--seller-sky);
          transform: translateY(-1px);
        }

        .sidebar-user {
          margin: 0.8rem;
          padding: 0.85rem;
          border: 1px solid rgba(8, 119, 191, 0.1);
          border-radius: 1rem;
          background: linear-gradient(135deg, #f9fdff, #eff9ff);
        }

        .sidebar-avatar {
          width: 2.65rem;
          height: 2.65rem;
          color: #fff;
          background: linear-gradient(135deg, #63b8f3, #0877bf);
          box-shadow: 0 7px 15px rgba(8, 119, 191, 0.2);
        }

        .sidebar-user-info h4 {
          margin: 0;
          color: var(--seller-ink);
          font-weight: 800;
        }

        .sidebar-user-info p {
          margin: 0.22rem 0 0;
          color: var(--seller-muted);
          font-weight: 600;
        }

        .sidebar-nav {
          padding: 0.9rem 0.75rem 1rem;
          gap: 0.7rem;
        }

        .sidebar-nav-group {
          display: grid;
          gap: 0.2rem;
          padding: 0.1rem 0;
        }

        .sidebar-nav-group + .sidebar-nav-group {
          padding-top: 0.72rem;
          border-top: 1px solid rgba(8, 119, 191, 0.08);
        }

        .sidebar-nav-link {
          min-height: 2.85rem;
          border: 1px solid transparent;
          color: #475569;
          font-size: 0.89rem;
          font-weight: 700;
        }

        .sidebar-nav-link:hover {
          color: var(--seller-blue-strong);
          border-color: rgba(8, 119, 191, 0.1);
          background: #f2f9fe;
        }

        .sidebar-nav-link.active {
          color: var(--seller-blue-strong);
          border-color: rgba(8, 119, 191, 0.16);
          background: linear-gradient(90deg, rgba(99, 184, 243, 0.2), rgba(234, 247, 255, 0.72));
          box-shadow: inset 3px 0 0 var(--seller-blue);
        }

        .sidebar-nav-icon {
          color: currentColor;
          stroke-width: 2;
        }

        .sidebar-section-label {
          margin: 0 0 0.26rem;
          padding: 0 0.72rem;
          color: #7890a9;
          font-size: 0.61rem;
          letter-spacing: 0.12em;
        }

        .sidebar-unread-badge {
          margin-inline-start: auto;
          margin-left: 0;
          background: var(--seller-blue);
          box-shadow: 0 3px 9px rgba(8, 119, 191, 0.24);
        }

        .sidebar-footer {
          border-top-color: rgba(8, 119, 191, 0.1);
        }

        .sidebar-logout {
          color: #b42318;
          font-weight: 750;
        }

        .dashboard-main.with-sidebar {
          margin-inline-start: 280px;
          margin-left: 0;
        }

        .dashboard-main.without-sidebar {
          margin-inline-start: 80px;
          margin-left: 0;
        }

        .dashboard-content {
          width: min(100%, 1440px);
          margin: 0 auto;
        }

        .seller-workspace-topbar {
          min-height: 4.35rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.15rem;
          padding: 0.9rem 1rem 0.9rem 1.15rem;
          border: 1px solid rgba(8, 119, 191, 0.1);
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.74);
          box-shadow: 0 10px 30px rgba(7, 27, 53, 0.045);
        }

        .seller-workspace-topbar span:first-child {
          display: block;
          color: var(--seller-blue);
          font-size: 0.65rem;
          font-weight: 850;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .seller-workspace-topbar h1 {
          margin: 0.13rem 0 0;
          color: var(--seller-ink);
          font-size: clamp(1.15rem, 1.8vw, 1.55rem);
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -0.04em;
        }

        .seller-workspace-primary-action {
          min-height: 2.75rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          flex: 0 0 auto;
          padding: 0.7rem 0.9rem;
          border-radius: 0.8rem;
          color: #fff;
          background: linear-gradient(135deg, #0877bf, #0665a6);
          box-shadow: 0 9px 18px rgba(8, 119, 191, 0.22);
          font-size: 0.82rem;
          font-weight: 800;
          text-decoration: none;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .seller-workspace-primary-action:hover {
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(8, 119, 191, 0.28);
        }

        .seller-workspace-primary-action svg {
          width: 1rem;
          height: 1rem;
          stroke-width: 2.5;
        }

        .dashboard-content .stat-card,
        .dashboard-content .products-card,
        .dashboard-content .recent-orders-card,
        .dashboard-content .transactions-card,
        .dashboard-content .seller-cod-order,
        .dashboard-content .seller-findit-request,
        .dashboard-content .seller-findit-offers,
        .dashboard-content .seller-dispute-card,
        .dashboard-content .seller-disputes__empty {
          border: 1px solid rgba(8, 119, 191, 0.1);
          box-shadow: 0 10px 28px rgba(7, 27, 53, 0.045);
        }

        .dashboard-content :focus-visible {
          outline: 3px solid rgba(99, 184, 243, 0.42);
          outline-offset: 3px;
        }

        /* Light glass seller workspace shell */
        .dashboard-sidebar {
          border-inline-end-color: rgba(255, 255, 255, 0.72);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(238, 249, 255, 0.64)),
            radial-gradient(circle at 12% 0%, rgba(99, 184, 243, 0.24), transparent 18rem);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          box-shadow: 16px 0 42px rgba(7, 27, 53, 0.12);
        }

        .sidebar-header,
        .sidebar-footer {
          border-color: rgba(8, 119, 191, 0.11);
        }

        .sidebar-brand-lockup,
        .sidebar-user-info h4 {
          color: var(--seller-ink);
        }

        .sidebar-brand-lockup small,
        .sidebar-user-info p,
        .sidebar-section-label {
          color: #607995;
        }

        .sidebar-toggle {
          border-color: rgba(8, 119, 191, 0.16);
          color: var(--seller-blue);
          background: rgba(255, 255, 255, 0.56);
          box-shadow: 0 5px 13px rgba(8, 119, 191, 0.08);
        }

        .sidebar-toggle:hover {
          border-color: rgba(8, 119, 191, 0.32);
          color: var(--seller-blue-strong);
          background: rgba(234, 247, 255, 0.78);
        }

        .sidebar-user {
          border-color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.44);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 7px 18px rgba(7, 27, 53, 0.04);
        }

        .sidebar-avatar {
          border: 2px solid rgba(255, 255, 255, 0.72);
          background: linear-gradient(135deg, #63b8f3, #0877bf);
        }

        .sidebar-nav-group + .sidebar-nav-group {
          border-top-color: rgba(8, 119, 191, 0.09);
        }

        .sidebar-nav-link {
          color: #425a73;
        }

        .sidebar-nav-link:hover {
          border-color: rgba(8, 119, 191, 0.11);
          color: var(--seller-blue-strong);
          background: rgba(255, 255, 255, 0.62);
        }

        .sidebar-nav-link.active {
          border-color: rgba(8, 119, 191, 0.16);
          color: var(--seller-blue-strong);
          background: linear-gradient(90deg, rgba(99, 184, 243, 0.26), rgba(255, 255, 255, 0.6));
          box-shadow: inset 3px 0 0 var(--seller-blue), 0 6px 16px rgba(8, 119, 191, 0.08);
        }

        .sidebar-unread-badge {
          color: #ffffff;
          background: var(--seller-blue);
          box-shadow: 0 3px 10px rgba(8, 119, 191, 0.22);
        }

        .dashboard-main {
          transition: margin-inline-start 300ms ease, padding 300ms ease;
        }

        @media (min-width: 1025px) and (max-width: 1240px) {
          .dashboard-sidebar.open {
            width: 248px;
          }

          .dashboard-main.with-sidebar {
            margin-inline-start: 248px;
          }

          .dashboard-main {
            padding: 1.15rem;
          }

          .seller-workspace-topbar {
            margin-bottom: 0.95rem;
          }
        }

        @media (min-width: 1440px) {
          .dashboard-sidebar.open {
            width: 292px;
          }

          .dashboard-main.with-sidebar {
            margin-inline-start: 292px;
          }

          .dashboard-main {
            padding: 1.75rem clamp(1.5rem, 3vw, 3rem) 3rem;
          }

          .dashboard-content {
            width: min(100%, 1510px);
          }
        }

        @media (max-width: 1024px) {
          .dashboard-sidebar {
            top: var(--navbar-height, 64px);
            bottom: 0;
            width: min(19rem, 88vw) !important;
            height: auto;
            border-radius: 0 1.25rem 1.25rem 0;
            border-inline-end: 0;
            position: fixed;
            transform: translateX(-105%);
            z-index: 60;
          }

          .dashboard-sidebar.mobile-open {
            transform: translateX(0);
          }

          [dir='rtl'] .dashboard-sidebar {
            border-radius: 1.25rem 0 0 1.25rem;
            transform: translateX(105%);
          }

          [dir='rtl'] .dashboard-sidebar.mobile-open {
            transform: translateX(0);
          }

          .mobile-dashboard-header {
            display: flex;
          }

          .mobile-close-btn {
            display: block;
            color: var(--seller-blue);
          }

          .sidebar-toggle {
            display: none;
          }

          .dashboard-container {
            min-height: calc(100dvh - var(--navbar-height, 64px));
            padding-top: 70px;
          }

          .dashboard-main.with-sidebar,
          .dashboard-main.without-sidebar {
            margin-inline-start: 0;
            margin-left: 0;
          }

          .dashboard-main {
            min-height: calc(100dvh - 144px);
            padding: clamp(0.85rem, 2.4vw, 1.25rem);
          }

          .seller-workspace-topbar {
            min-height: 4rem;
            margin-bottom: 0.9rem;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding-top: 70px;
          }

          .mobile-dashboard-header {
            top: var(--navbar-height, 64px);
            min-height: 70px;
            border-bottom-color: rgba(8, 119, 191, 0.1);
            background: rgba(255, 255, 255, 0.9);
          }

          .mobile-dashboard-title span {
            color: var(--seller-blue);
          }

          .mobile-dashboard-title h1 {
            color: var(--seller-ink);
          }

          .dashboard-sidebar {
            border-radius: 0 1.25rem 1.25rem 0;
          }

          .sidebar-nav {
            padding: 0.85rem;
          }

          .sidebar-nav-group + .sidebar-nav-group {
            padding-top: 0.65rem;
          }

          [dir='rtl'] .dashboard-sidebar {
            border-radius: 1.25rem 0 0 1.25rem;
            transform: translateX(100%);
          }

          [dir='rtl'] .dashboard-sidebar.mobile-open {
            transform: translateX(0);
          }

          .dashboard-main {
            padding: 0.85rem;
          }

          .dashboard-main.with-sidebar,
          .dashboard-main.without-sidebar {
            margin-inline-start: 0;
            margin-left: 0;
          }

          .seller-workspace-topbar {
            min-height: 4rem;
            margin-bottom: 0.85rem;
            padding: 0.75rem 0.85rem;
            border-radius: 0.9rem;
          }

          .seller-workspace-primary-action {
            width: 2.7rem;
            padding: 0;
          }

          .seller-workspace-primary-action span {
            display: none;
          }
        }

        @media (max-width: 420px) {
          .dashboard-main {
            padding: 0.7rem;
          }

          .seller-workspace-topbar h1 {
            font-size: 1.08rem;
          }
        }
      `}</style>
      <style>{`
        /* Top workspace navigation: the menu remains in document flow on every screen. */
        .dashboard-container--top-menu {
          --seller-dashboard-width: min(1440px, calc(100% - clamp(1rem, 4vw, 4rem)));
          min-height: calc(100dvh - var(--navbar-height, 80px));
          padding: clamp(0.85rem, 2vw, 1.75rem) 0 clamp(2rem, 5vw, 4rem);
          background:
            radial-gradient(circle at 92% 0%, rgba(76, 170, 255, 0.13), transparent 28rem),
            linear-gradient(180deg, #f8fbff 0%, #f4f8fd 55%, #f8fafc 100%);
        }

        .dashboard-container--top-menu .seller-workspace-topbar {
          position: sticky;
          top: calc(var(--navbar-height, 80px) + 0.55rem);
          z-index: 30;
          width: var(--seller-dashboard-width);
          min-height: 76px;
          margin: 0 auto;
          padding: 0.85rem 1rem 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid rgba(25, 102, 179, 0.13);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 14px 36px rgba(17, 56, 95, 0.09);
          backdrop-filter: blur(18px) saturate(145%);
          -webkit-backdrop-filter: blur(18px) saturate(145%);
        }

        .dashboard-container--top-menu .seller-workspace-heading {
          min-width: 0;
        }

        .dashboard-container--top-menu .seller-workspace-heading > span {
          display: block;
          color: #397ebb;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.09em;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .dashboard-container--top-menu .seller-workspace-heading h1 {
          margin: 0.2rem 0 0;
          color: #102a43;
          font-size: clamp(1.05rem, 1.5vw, 1.35rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        .seller-workspace-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .dashboard-container--top-menu .seller-workspace-primary-action,
        .seller-workspace-menu-toggle {
          min-height: 43px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border-radius: 13px;
          font-size: 0.83rem;
          font-weight: 800;
          text-decoration: none;
          transition: transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .dashboard-container--top-menu .seller-workspace-primary-action {
          padding: 0.65rem 0.9rem;
          color: #fff;
          border: 1px solid #1675bf;
          background: linear-gradient(135deg, #0d5f9f, #278fd5);
          box-shadow: 0 8px 18px rgba(22, 117, 191, 0.22);
        }

        .dashboard-container--top-menu .seller-workspace-primary-action svg,
        .seller-workspace-menu-toggle svg {
          width: 1.08rem;
          height: 1.08rem;
          flex: 0 0 auto;
        }

        .seller-workspace-menu-toggle {
          padding: 0.65rem 0.85rem;
          color: #164d79;
          border: 1px solid rgba(21, 103, 171, 0.2);
          background: rgba(245, 250, 255, 0.88);
          cursor: pointer;
        }

        .seller-workspace-menu-toggle:hover,
        .seller-workspace-menu-toggle.is-open {
          color: #0e5c9c;
          border-color: rgba(20, 119, 196, 0.4);
          background: #eaf6ff;
          box-shadow: 0 8px 20px rgba(17, 102, 173, 0.12);
        }

        .dashboard-container--top-menu .seller-workspace-primary-action:hover,
        .seller-workspace-menu-toggle:hover {
          transform: translateY(-1px);
        }

        .seller-workspace-menu-toggle:focus-visible,
        .seller-workspace-nav-link:focus-visible,
        .seller-workspace-logout:focus-visible {
          outline: 3px solid rgba(59, 154, 226, 0.35);
          outline-offset: 2px;
        }

        .seller-workspace-menu {
          width: var(--seller-dashboard-width);
          margin: 0 auto;
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 250ms ease, margin 250ms ease;
        }

        .seller-workspace-menu.is-open {
          grid-template-rows: 1fr;
          margin-top: 0.7rem;
          margin-bottom: 0.85rem;
        }

        .seller-workspace-menu-inner {
          min-height: 0;
          overflow: hidden;
        }

        .seller-workspace-menu-panel {
          display: grid;
          grid-template-columns: minmax(12rem, 0.8fr) minmax(0, 3.2fr);
          gap: 0.85rem;
          padding: 0.85rem;
          border: 1px solid rgba(25, 102, 179, 0.13);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 18px 34px rgba(17, 56, 95, 0.08);
          backdrop-filter: blur(18px) saturate(145%);
          -webkit-backdrop-filter: blur(18px) saturate(145%);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-0.5rem);
          transition: opacity 180ms ease, transform 250ms ease, visibility 0s linear 250ms;
        }

        .seller-workspace-menu.is-open .seller-workspace-menu-panel {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          transition-delay: 60ms, 0s, 0s;
        }

        .seller-workspace-user {
          min-width: 0;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.72rem;
          padding: 1rem;
          border: 1px solid rgba(25, 102, 179, 0.13);
          border-radius: 17px;
          background: linear-gradient(145deg, rgba(236, 248, 255, 0.94), rgba(255, 255, 255, 0.82));
        }

        .seller-workspace-user .sidebar-avatar {
          width: 48px;
          height: 48px;
          margin: 0;
          flex: 0 0 auto;
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.94);
          box-shadow: 0 5px 16px rgba(17, 83, 137, 0.16);
        }

        .seller-workspace-user-info {
          min-width: 0;
        }

        .seller-workspace-user-info h4 {
          margin: 0;
          overflow: hidden;
          color: #123b5b;
          font-size: 0.95rem;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .seller-workspace-user-info p {
          margin: 0.2rem 0 0;
          color: #58809e;
          font-size: 0.77rem;
          font-weight: 650;
          line-height: 1.4;
        }

        .seller-workspace-logout {
          width: 100%;
          margin-top: auto;
          padding: 0.62rem 0.7rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          color: #a93838;
          border: 1px solid rgba(186, 65, 65, 0.18);
          border-radius: 11px;
          background: rgba(255, 249, 249, 0.72);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 800;
          transition: background-color 180ms ease, border-color 180ms ease;
        }

        .seller-workspace-logout:hover {
          border-color: rgba(186, 65, 65, 0.38);
          background: #fff2f2;
        }

        .seller-workspace-logout svg {
          width: 1rem;
          height: 1rem;
        }

        .seller-workspace-nav {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.7rem;
        }

        .seller-workspace-nav-group {
          min-width: 0;
          padding: 0.78rem;
          border: 1px solid rgba(25, 102, 179, 0.1);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.54);
        }

        .seller-workspace-section-label {
          margin: 0 0 0.48rem;
          color: #3d78a5;
          font-size: 0.67rem;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .seller-workspace-nav-link {
          min-width: 0;
          min-height: 38px;
          margin-top: 0.2rem;
          padding: 0.45rem 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.48rem;
          color: #315a78;
          border-radius: 10px;
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1.25;
          text-decoration: none;
          transition: color 180ms ease, background-color 180ms ease, transform 180ms ease;
        }

        .seller-workspace-nav-link:hover {
          color: #075a9e;
          background: #edf8ff;
          transform: translateX(2px);
        }

        [dir='rtl'] .seller-workspace-nav-link:hover {
          transform: translateX(-2px);
        }

        .seller-workspace-nav-link.active {
          color: #075a9e;
          background: linear-gradient(135deg, #def2ff, #edf8ff);
          box-shadow: inset 3px 0 0 #218ed3;
        }

        [dir='rtl'] .seller-workspace-nav-link.active {
          box-shadow: inset -3px 0 0 #218ed3;
        }

        .seller-workspace-nav-link svg {
          width: 1rem;
          height: 1rem;
          flex: 0 0 auto;
        }

        .seller-workspace-nav-link > span:not(.seller-workspace-count) {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .seller-workspace-count {
          min-width: 1.3rem;
          height: 1.3rem;
          margin-inline-start: auto;
          padding: 0 0.25rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          border-radius: 999px;
          background: #1883ca;
          font-size: 0.64rem;
          font-weight: 850;
        }

        .dashboard-container--top-menu .dashboard-main,
        .dashboard-container--top-menu .dashboard-main.with-sidebar,
        .dashboard-container--top-menu .dashboard-main.without-sidebar {
          min-height: auto;
          margin: 0 !important;
          padding: 0;
        }

        .dashboard-container--top-menu .dashboard-content {
          width: var(--seller-dashboard-width);
          max-width: none;
          margin: 0 auto;
          padding: clamp(0.7rem, 1.6vw, 1.25rem) 0 0;
        }

        @media (max-width: 1180px) {
          .seller-workspace-menu-panel {
            grid-template-columns: 1fr;
          }

          .seller-workspace-user {
            min-height: auto;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: center;
          }

          .seller-workspace-logout {
            width: auto;
            margin-top: 0;
          }

          .seller-workspace-nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .dashboard-container--top-menu {
            --seller-dashboard-width: min(100% - 1rem, 1440px);
            padding-top: 0.5rem;
          }

          .dashboard-container--top-menu .seller-workspace-topbar {
            top: calc(var(--navbar-height, 68px) + 0.35rem);
            min-height: 66px;
            padding: 0.65rem 0.72rem 0.65rem 0.9rem;
            gap: 0.7rem;
            border-radius: 17px;
          }

          .seller-workspace-actions {
            gap: 0.4rem;
          }

          .dashboard-container--top-menu .seller-workspace-primary-action,
          .seller-workspace-menu-toggle {
            min-height: 39px;
            padding: 0.55rem 0.64rem;
            border-radius: 11px;
          }

          .dashboard-container--top-menu .seller-workspace-primary-action span,
          .seller-workspace-menu-toggle span {
            display: none;
          }

          .dashboard-container--top-menu .seller-workspace-primary-action svg,
          .seller-workspace-menu-toggle svg {
            width: 1.16rem;
            height: 1.16rem;
          }

          .seller-workspace-menu.is-open {
            margin-top: 0.5rem;
          }

          .seller-workspace-menu-panel {
            padding: 0.6rem;
            border-radius: 17px;
          }

          .seller-workspace-user {
            padding: 0.78rem;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 0.55rem;
          }

          .seller-workspace-user .sidebar-avatar {
            width: 42px;
            height: 42px;
          }

          .seller-workspace-logout {
            min-width: 38px;
            padding: 0.55rem;
          }

          .seller-workspace-logout span {
            display: none;
          }

          .seller-workspace-nav {
            grid-template-columns: 1fr;
            gap: 0.55rem;
          }

          .seller-workspace-nav-group {
            padding: 0.65rem;
            border-radius: 13px;
          }

          .seller-workspace-nav-link {
            min-height: 40px;
            font-size: 0.82rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .seller-workspace-menu,
          .seller-workspace-menu-panel,
          .seller-workspace-nav-link,
          .seller-workspace-menu-toggle,
          .dashboard-container--top-menu .seller-workspace-primary-action {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
