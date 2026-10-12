import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, ShoppingBagIcon, AcademicCapIcon,
  WrenchScrewdriverIcon, CurrencyDollarIcon, Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon, ComputerDesktopIcon, MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon, Bars3Icon, XMarkIcon, ClipboardDocumentListIcon,
  HeartIcon, ShoppingCartIcon, TagIcon, ShieldExclamationIcon, PlusIcon, SparklesIcon
} from '@heroicons/react/24/outline';
import useAuth from '../../../hooks/useAuth';
import useCart from '../../../hooks/useCart';
import useFavorites from '../../../hooks/useFavorites';
import { getImageUrl } from '../../../utils/imageUtils';
import api from '../../../services/api';
import { useTranslation } from 'react-i18next';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { favoritesCount } = useFavorites();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  // Auto‑close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const selectedWorkspaceItems = sellerWorkspaceItems[user?.sellerType]
    ? [sellerWorkspaceItems[user.sellerType]]
    : Object.values(sellerWorkspaceItems);
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsSidebarOpen(true);
    setIsMobileMenuOpen((isOpen) => !isOpen);
  };
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="dashboard-container">
      {/* Mobile header with hamburger */}
      <div className="mobile-dashboard-header">
        <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label={t('sellerDashboard.open')} aria-controls="seller-workspace-navigation" aria-expanded={isMobileMenuOpen}>
          <Bars3Icon className="icon" />
        </button>
        <div className="mobile-dashboard-title">
          <span>{t('sellerDashboard.title')}</span>
          <h1>{activeSection}</h1>
        </div>
        <div className="placeholder" />
      </div>

      {/* Overlay for mobile sidebar */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />

      {/* Sidebar */}
      <aside id="seller-workspace-navigation" className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`} aria-label={t('sellerDashboard.title')}>
        <div className="sidebar-header">
          <div className="sidebar-brand-lockup" aria-hidden={!isSidebarOpen}>
            <span className="sidebar-brand-mark"><SparklesIcon /></span>
            {isSidebarOpen && <div><strong>rifKANDO</strong><small>{t('sellerDashboard.title')}</small></div>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle" aria-label={isSidebarOpen ? t('sellerDashboard.collapse') : t('sellerDashboard.expand')}>
            {isSidebarOpen ? '←' : '→'}
          </button>
          {/* Close button for mobile */}
          <button className="mobile-close-btn" onClick={closeMobileMenu} aria-label={t('sellerDashboard.close')}>
            <XMarkIcon className="icon" />
          </button>
        </div>

        <div className="sidebar-user">
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
          {isSidebarOpen && (
            <div className="sidebar-user-info">
              <h4>{user?.name || t('sellerDashboard.seller')}</h4>
              <p>{user?.sellerType === 'product' ? t('sellerDashboard.productSeller') :
                     user?.sellerType === 'course' ? t('sellerDashboard.courseInstructor') :
                     user?.sellerType === 'service' ? t('sellerDashboard.serviceProvider') :
                     user?.sellerType === 'digital' ? t('sellerDashboard.digitalCreator') : t('sellerDashboard.seller')}</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="sidebar-nav-group" key={group.name}>
              {isSidebarOpen && <p className="sidebar-section-label">{group.name}</p>}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    <Icon className="sidebar-nav-icon" />
                    {isSidebarOpen && <span>{item.name}</span>}
                    {item.unreadCount > 0 && <span className="sidebar-unread-badge">{item.unreadCount}</span>}
                    {item.count > 0 && <span className="sidebar-unread-badge">{item.count}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout">
            <ArrowLeftOnRectangleIcon className="sidebar-nav-icon" />
            {isSidebarOpen && <span>{t('sellerDashboard.exit')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`dashboard-main ${isSidebarOpen ? 'with-sidebar' : 'without-sidebar'}`}>
        <div className="dashboard-content">
          <header className="seller-workspace-topbar">
            <div>
              <span>rifKANDO</span>
              <h1>{activeSection}</h1>
            </div>
            {canCreateProduct && (
              <Link to="products/add" className="seller-workspace-primary-action">
                <PlusIcon aria-hidden="true" />
                <span>{t('sellerProducts.add')}</span>
              </Link>
            )}
          </header>
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

        .sidebar-brand-mark {
          width: 2.2rem;
          height: 2.2rem;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #fff;
          border-radius: 0.78rem;
          background: linear-gradient(135deg, #63b8f3, #0877bf 58%, #0665a6);
          box-shadow: 0 9px 20px rgba(8, 119, 191, 0.23);
        }

        .sidebar-brand-mark svg {
          width: 1.15rem;
          height: 1.15rem;
          stroke-width: 2.25;
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

        /* Blue glass seller workspace shell */
        .dashboard-sidebar {
          border-inline-end-color: rgba(156, 219, 255, 0.2);
          background:
            radial-gradient(circle at 8% 0%, rgba(99, 184, 243, 0.42), transparent 17rem),
            radial-gradient(circle at 108% 60%, rgba(20, 125, 195, 0.42), transparent 20rem),
            linear-gradient(165deg, rgba(7, 79, 135, 0.98), rgba(5, 52, 94, 0.98) 52%, rgba(3, 27, 61, 0.99));
          box-shadow: 16px 0 42px rgba(2, 24, 53, 0.18);
        }

        .sidebar-header {
          border-bottom-color: rgba(191, 231, 255, 0.17);
        }

        .sidebar-brand-lockup {
          color: #ffffff;
        }

        .sidebar-brand-lockup small,
        .sidebar-user-info p,
        .sidebar-section-label {
          color: rgba(225, 245, 255, 0.74);
        }

        .sidebar-brand-mark {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.14);
          box-shadow: 0 9px 22px rgba(1, 22, 49, 0.24);
        }

        .sidebar-toggle {
          border-color: rgba(191, 231, 255, 0.26);
          color: #effaff;
          background: rgba(255, 255, 255, 0.1);
          box-shadow: none;
        }

        .sidebar-toggle:hover {
          border-color: rgba(255, 255, 255, 0.48);
          color: #ffffff;
          background: rgba(255, 255, 255, 0.18);
        }

        .sidebar-user {
          border-color: rgba(191, 231, 255, 0.16);
          background: rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.11);
        }

        .sidebar-avatar {
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: linear-gradient(135deg, #9cddff, #2b93d8);
          box-shadow: 0 8px 18px rgba(1, 22, 49, 0.26);
        }

        .sidebar-user-info h4 {
          color: #ffffff;
        }

        .sidebar-nav-group + .sidebar-nav-group {
          border-top-color: rgba(191, 231, 255, 0.12);
        }

        .sidebar-nav-link {
          color: rgba(242, 250, 255, 0.84);
        }

        .sidebar-nav-link:hover {
          border-color: rgba(191, 231, 255, 0.18);
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .sidebar-nav-link.active {
          border-color: rgba(209, 240, 255, 0.3);
          color: #ffffff;
          background: linear-gradient(90deg, rgba(120, 204, 249, 0.34), rgba(255, 255, 255, 0.13));
          box-shadow: inset 3px 0 0 #b7e8ff, 0 6px 16px rgba(1, 25, 57, 0.14);
        }

        .sidebar-unread-badge {
          color: #07558d;
          background: #ffffff;
          box-shadow: 0 3px 10px rgba(1, 22, 49, 0.2);
        }

        .sidebar-footer {
          border-top-color: rgba(191, 231, 255, 0.14);
        }

        .sidebar-logout {
          color: #ffe0df;
        }

        .sidebar-logout:hover {
          color: #fff;
          background: rgba(255, 122, 122, 0.15);
        }

        @media (min-width: 769px) and (max-width: 1180px) {
          .dashboard-sidebar.open {
            width: 248px;
          }

          .dashboard-main.with-sidebar {
            margin-inline-start: 248px;
          }

          .dashboard-main {
            padding: 1.25rem;
          }

          .sidebar-user {
            margin: 0.65rem;
            padding: 0.72rem;
          }

          .sidebar-nav {
            padding: 0.7rem 0.6rem 0.8rem;
          }

          .sidebar-nav-link {
            gap: 0.62rem;
            padding: 0.68rem;
          }

          .seller-workspace-topbar {
            margin-bottom: 1rem;
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
    </div>
  );
};

export default DashboardLayout;
