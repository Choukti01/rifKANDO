import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, ShoppingBagIcon, AcademicCapIcon,
  WrenchScrewdriverIcon, CurrencyDollarIcon, Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon, ComputerDesktopIcon, CalendarIcon,
  ChatBubbleLeftRightIcon, ShieldCheckIcon, Bars3Icon, XMarkIcon, ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import useAuth from '../../../hooks/useAuth';
import { getImageUrl } from '../../../utils/imageUtils';
import api from '../../../services/api';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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
    product: { name: 'Products', icon: ShoppingBagIcon, path: 'products' },
    course: { name: 'Courses', icon: AcademicCapIcon, path: 'courses' },
    service: { name: 'Services', icon: WrenchScrewdriverIcon, path: 'services' },
    digital: { name: 'Digital', icon: ComputerDesktopIcon, path: 'digital' },
    booking: { name: 'Bookings', icon: CalendarIcon, path: 'bookings' },
  };
  const selectedWorkspaceItems = sellerWorkspaceItems[user?.sellerType]
    ? [sellerWorkspaceItems[user.sellerType]]
    : Object.values(sellerWorkspaceItems);
  const navItems = [
    { name: 'Overview', icon: HomeIcon, path: 'overview' },
    ...selectedWorkspaceItems,
    { name: 'Orders', icon: ClipboardDocumentListIcon, path: 'orders' },
    { name: 'Offers', icon: ChatBubbleLeftRightIcon, path: 'offers' },
    { name: 'Messages', icon: ChatBubbleLeftRightIcon, path: 'messages', unreadCount },
    { name: 'Wallet', icon: CurrencyDollarIcon, path: 'wallet' },
    { name: 'Verification', icon: ShieldCheckIcon, path: 'verification' },
    { name: 'Settings', icon: Cog6ToothIcon, path: 'settings' },
  ];
  const activeSection = navItems.find(({ path }) =>
    location.pathname.startsWith(`/seller/dashboard/${path}`)
  )?.name || 'Seller workspace';

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
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <Bars3Icon className="icon" />
        </button>
        <div className="mobile-dashboard-title">
          <span>Seller dashboard</span>
          <h1>{activeSection}</h1>
        </div>
        <div className="placeholder" />
      </div>

      {/* Overlay for mobile sidebar */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />

      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle">
            {isSidebarOpen ? '←' : '→'}
          </button>
          {/* Close button for mobile */}
          <button className="mobile-close-btn" onClick={closeMobileMenu}>
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
              <span>{user?.name?.charAt(0) || 'S'}</span>
            )}
          </div>
          {isSidebarOpen && (
            <div className="sidebar-user-info">
              <h4>{user?.name || 'Seller'}</h4>
              <p>{user?.sellerType === 'product' ? 'Product Seller' : 
                     user?.sellerType === 'course' ? 'Course Instructor' :
                     user?.sellerType === 'service' ? 'Service Provider' : 
                     user?.sellerType === 'digital' ? 'Digital Creator' :
                     user?.sellerType === 'booking' ? 'Booking Professional' : 'Seller'}</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
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
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout">
            <ArrowLeftOnRectangleIcon className="sidebar-nav-icon" />
            {isSidebarOpen && <span>Exit Dashboard</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className={`dashboard-main ${isSidebarOpen ? 'with-sidebar' : 'without-sidebar'}`}>
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>

      <style>{`
        .dashboard-container {
          min-height: calc(100dvh - 80px);
          background: #f6f8fb;
          display: block;
          position: relative;
          isolation: isolate;
        }

        /* Mobile header (visible only on small screens) */
        .mobile-dashboard-header {
          display: none;
          position: fixed;
          top: 80px;
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
          top: 80px;
          left: 0;
          width: 100%;
          height: calc(100dvh - 80px);
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
          top: 80px;
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
            top: 80px;
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
            min-height: calc(100dvh - 80px);
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
        .dashboard-sidebar.closed .sidebar-unread-badge {
          display: none;
        }
        .dashboard-main {
          min-height: calc(100dvh - 80px);
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
    </div>
  );
};

export default DashboardLayout;
