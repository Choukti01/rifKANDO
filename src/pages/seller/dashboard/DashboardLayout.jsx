import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, ChartBarIcon, ShoppingBagIcon, AcademicCapIcon, 
  WrenchScrewdriverIcon, CurrencyDollarIcon, Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon, ComputerDesktopIcon, CalendarIcon,
  ChatBubbleLeftRightIcon, ShieldCheckIcon, Bars3Icon, XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { getImageUrl } from '../../../utils/imageUtils';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Auto-close mobile menu when resizing to desktop
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

  const navItems = [
    { name: 'Overview', icon: HomeIcon, path: 'overview' },
    { name: 'Products', icon: ShoppingBagIcon, path: 'products' },
    { name: 'Courses', icon: AcademicCapIcon, path: 'courses' },
    { name: 'Services', icon: WrenchScrewdriverIcon, path: 'services' },
    { name: 'Digital', icon: ComputerDesktopIcon, path: 'digital' },
    { name: 'Bookings', icon: CalendarIcon, path: 'bookings' },
    { name: 'Offers', icon: ChatBubbleLeftRightIcon, path: 'offers' },
    { name: 'Wallet', icon: CurrencyDollarIcon, path: 'wallet' },
    { name: 'Verification', icon: ShieldCheckIcon, path: 'verification' },
    { name: 'Settings', icon: Cog6ToothIcon, path: 'settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="dashboard-container">

      {/* Mobile header with hamburger */}
      <div className="mobile-dashboard-header">
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <Bars3Icon className="icon" />
        </button>
        <h1>Dashboard</h1>
        <div className="placeholder" />
      </div>

      {/* Overlay for mobile sidebar */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />

      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <img src="/logo.png" alt="rifKANDO" className="sidebar-logo-img" />
            </div>
            {isSidebarOpen && (
              <span className="sidebar-logo-text">
                rif<span className="text-primary">KANDO</span>
              </span>
            )}
          </div>

          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle">
            {isSidebarOpen ? '←' : '→'}
          </button>

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
              <p>
                {user?.sellerType === 'product' ? 'Product Seller' :
                 user?.sellerType === 'course' ? 'Course Instructor' :
                 user?.sellerType === 'service' ? 'Service Provider' :
                 user?.sellerType === 'digital' ? 'Digital Creator' :
                 user?.sellerType === 'booking' ? 'Booking Professional' :
                 'Seller'}
              </p>
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
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? 'active' : ''}`
                }
                onClick={closeMobileMenu}
              >
                <Icon className="sidebar-nav-icon" />
                {isSidebarOpen && <span>{item.name}</span>}
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
        <div className="dashboard-header desktop-only">
          <h1>Dashboard</h1>
        </div>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>

      <style>{`
        .dashboard-container {
          min-height: calc(100vh - 80px);
          background: #f9fafb;
          display: flex;
          position: relative;
        }

        .mobile-dashboard-header {
          display: none;
          position: fixed;
          top: 80px;
          left: 0;
          right: 0;
          background: white;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          align-items: center;
          justify-content: space-between;
          z-index: 45;
        }

        .mobile-dashboard-header h1 {
          font-size: 1.25rem;
          margin: 0;
        }

        .mobile-menu-btn {
          background: none;
          border: none;
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

        .mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 39;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease;
        }

        .mobile-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        /* =========================
           SIDEBAR (ONLY FIX ADDED)
        ========================== */

        .dashboard-sidebar {
          position: fixed;
          top: 80px;
          left: 0;
          height: calc(100vh - 80px);
          background: white;
          box-shadow: 1px 0 3px rgba(0,0,0,0.05);
          transition: width 0.3s ease, transform 0.3s ease;
          z-index: 40;
          display: flex;
          flex-direction: column;

          /* ✅ added */
          overflow: hidden;
        }

        .dashboard-sidebar.open {
          width: 280px;
        }

        .dashboard-sidebar.closed {
          width: 80px;
        }

        /* NAV SCROLL ENABLED */
        .sidebar-nav {
          flex: 1;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          /* ✅ added */
          overflow-y: auto;
        }

        .sidebar-header {
          padding: 1.25rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sidebar-logo-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .sidebar-logo-text {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .text-primary {
          color: #87CEEB;
        }

        .sidebar-toggle {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          color: #6b7280;
        }

        .sidebar-user {
          padding: 1.25rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.75rem;
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

        .sidebar-nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 0.5rem;
          color: #4b5563;
          text-decoration: none;
          transition: all 0.2s;
        }

        .sidebar-nav-link:hover {
          background: #f3f4f6;
        }

        .sidebar-nav-link.active {
          background: #87CEEB;
          color: #1a1a1a;
        }

        .sidebar-nav-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
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
        }

        .sidebar-logout:hover {
          background: #fee2e2;
        }

        .dashboard-main {
          flex: 1;
          transition: margin-left 0.3s ease;
          padding: 1.5rem;
        }

        .dashboard-main.with-sidebar {
          margin-left: 280px;
        }

        .dashboard-main.without-sidebar {
          margin-left: 80px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .dashboard-header h1 {
          font-size: 1.5rem;
          margin-bottom: 0;
        }

        @media (max-width: 768px) {
          .dashboard-main.with-sidebar,
          .dashboard-main.without-sidebar {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;