import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { 
  HomeIcon, ChartBarIcon, ShoppingBagIcon, AcademicCapIcon, 
  WrenchScrewdriverIcon, CurrencyDollarIcon, Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon, ComputerDesktopIcon, CalendarIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../../contexts/AuthContext'

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const navItems = [
    { name: 'Overview', icon: HomeIcon, path: 'overview' },
    { name: 'Products', icon: ShoppingBagIcon, path: 'products' },
    { name: 'Courses', icon: AcademicCapIcon, path: 'courses' },
    { name: 'Services', icon: WrenchScrewdriverIcon, path: 'services' },
    { name: 'Digital', icon: ComputerDesktopIcon, path: 'digital' },
    { name: 'Bookings', icon: CalendarIcon, path: 'bookings' },
    { name: 'Earnings', icon: CurrencyDollarIcon, path: 'earnings' },
    { name: 'Settings', icon: Cog6ToothIcon, path: 'settings' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <img 
                src="/logo.png" 
                alt="rifKANDI" 
                className="sidebar-logo-img"
              />
            </div>
            {isSidebarOpen && <span className="sidebar-logo-text">rif<span className="text-primary">KANDI</span></span>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle">
            {isSidebarOpen ? '←' : '→'}
          </button>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0) || 'S'}
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
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="sidebar-nav-icon" />
                {isSidebarOpen && <span>{item.name}</span>}
              </NavLink>
            )
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
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          {/* Add New button removed - use buttons inside each dashboard page instead */}
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
        }
        .dashboard-sidebar {
          position: fixed;
          top: 80px;
          left: 0;
          height: calc(100vh - 80px);
          background: white;
          box-shadow: 1px 0 3px rgba(0,0,0,0.05);
          transition: width 0.3s ease;
          z-index: 40;
          display: flex;
          flex-direction: column;
        }
        .dashboard-sidebar.open {
          width: 280px;
        }
        .dashboard-sidebar.closed {
          width: 80px;
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
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
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
          .dashboard-sidebar.open {
            width: 240px;
          }
          .dashboard-main.with-sidebar {
            margin-left: 240px;
          }
        }
      `}</style>
    </div>
  )
}

export default DashboardLayout