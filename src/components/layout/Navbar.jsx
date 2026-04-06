import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, ShoppingBagIcon, HeartIcon, UserIcon, Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
      setIsMenuOpen(false)
    }
  }

  const handleLogout = () => {
    logout()
    setIsProfileOpen(false)
    navigate('/')
  }

  const navLinks = [
    { name: 'Products', path: '/products' },
    { name: 'Courses', path: '/courses' },
    { name: 'Services', path: '/services' },
    { name: 'Digital', path: '/digital' },
    { name: 'Bookings', path: '/bookings' },
  ]

  return (
    <>
      <nav className="navbar">
        <div className="container">
          <div className="navbar-content">
            {/* Logo and Brand */}
            <Link to="/" className="brand-link">
              <div className="logo-icon">
                <img 
                  src="/logo.png" 
                  alt="rifKANDI" 
                  className="logo-img"
                />
              </div>
              <span className="brand-name">
                rif<span className="brand-accent">KANDI</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="nav-links-desktop">
              {navLinks.map(link => (
                <Link key={link.name} to={link.path} className="nav-link">
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="search-form-desktop">
              <div className="search-wrapper">
                <MagnifyingGlassIcon className="search-icon" />
                <input
                  type="text"
                  placeholder="Search products, courses, services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </form>

            {/* Icons */}
            <div className="nav-icons">
              <Link to="/favorites" className="nav-icon">
                <HeartIcon className="icon" />
              </Link>
              <Link to="/cart" className="nav-icon">
                <ShoppingBagIcon className="icon" />
              </Link>
              
              {/* Profile Dropdown */}
              <div className="profile-dropdown">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="nav-icon profile-btn"
                >
                  <UserIcon className="icon" />
                  {isAuthenticated && user && (
                    <span className="user-name">
                      {user.name?.split(' ')[0]}
                    </span>
                  )}
                  <ChevronDownIcon className="chevron-icon" />
                </button>

                {isProfileOpen && (
                  <div className="dropdown-menu">
                    {isAuthenticated ? (
                      <>
                        <div className="dropdown-header">
                          <p className="dropdown-name">{user?.name}</p>
                          <p className="dropdown-email">{user?.email}</p>
                        </div>
                        <Link to="/profile" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                          My Profile
                        </Link>
                        <Link to="/orders" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                          My Orders
                        </Link>
                        <Link to="/favorites" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                          Favorites
                        </Link>
                        <Link to="/choose-seller-type" className="dropdown-item seller-link" onClick={() => setIsProfileOpen(false)}>
                          Become a Seller
                        </Link>
                        <button onClick={handleLogout} className="dropdown-item logout-btn">
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                          Login
                        </Link>
                        <Link to="/register" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                          Register
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="mobile-menu-btn">
                {isMenuOpen ? <XMarkIcon className="icon" /> : <Bars3Icon className="icon" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <div className="container">
            <form onSubmit={handleSearch} className="mobile-search">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mobile-search-input"
              />
            </form>
            {navLinks.map(link => (
              <Link
                key={link.name}
                to={link.path}
                className="mobile-nav-link"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="mobile-menu-divider"></div>
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
                <Link to="/orders" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                <Link to="/favorites" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Favorites</Link>
                <button onClick={handleLogout} className="mobile-nav-link logout-mobile">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Login</Link>
                <Link to="/register" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: var(--color-white);
          box-shadow: var(--shadow-md);
          z-index: 1000;
          padding: 0.75rem 0;
        }
        .navbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          margin-right: 2.5rem;
        }
        .logo-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .brand-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-black);
          letter-spacing: -0.5px;
        }
        .brand-accent {
          color: var(--color-primary);
        }
        .nav-links-desktop {
          display: none;
          align-items: center;
          gap: 2rem;
          margin-right: auto;
        }
        .nav-link {
          text-decoration: none;
          color: var(--color-gray-600);
          font-weight: 500;
          font-size: 1rem;
          transition: color 0.2s;
          padding: 0.5rem 0;
          position: relative;
        }
        .nav-link:hover {
          color: var(--color-primary);
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--color-primary);
          transition: width 0.2s;
        }
        .nav-link:hover::after {
          width: 100%;
        }
        .search-form-desktop {
          display: none;
          flex: 1;
          max-width: 450px;
          margin: 0 1.5rem;
        }
        .search-wrapper {
          position: relative;
          width: 100%;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.1rem;
          height: 1.1rem;
          color: var(--color-gray-400);
        }
        .search-input {
          width: 100%;
          padding: 0.7rem 1rem 0.7rem 2.5rem;
          border: 1px solid var(--color-gray-200);
          border-radius: 50px;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.2s;
          background: var(--color-gray-50);
        }
        .search-input:focus {
          border-color: var(--color-primary);
          background: var(--color-white);
          box-shadow: 0 0 0 3px rgba(135,206,235,0.1);
        }
        .nav-icons {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .nav-icon {
          color: var(--color-gray-600);
          transition: color 0.2s;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          cursor: pointer;
        }
        .nav-icon:hover {
          color: var(--color-primary);
        }
        .icon {
          width: 1.25rem;
          height: 1.25rem;
        }
        .user-name {
          font-size: 0.9rem;
          font-weight: 500;
          display: none;
        }
        .chevron-icon {
          width: 0.875rem;
          height: 0.875rem;
          display: none;
        }
        .profile-dropdown {
          position: relative;
        }
        .profile-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .dropdown-menu {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 0.5rem;
          width: 220px;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 100;
          overflow: hidden;
        }
        .dropdown-header {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-gray-200);
          background: var(--color-gray-50);
        }
        .dropdown-name {
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        .dropdown-email {
          font-size: 0.75rem;
          color: var(--color-gray-500);
        }
        .dropdown-item {
          display: block;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          color: var(--color-gray-700);
          text-decoration: none;
          transition: background 0.2s;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
        }
        .dropdown-item:hover {
          background: var(--color-gray-100);
        }
        .seller-link {
          color: var(--color-primary);
          border-top: 1px solid var(--color-gray-200);
          margin-top: 0.25rem;
        }
        .logout-btn {
          color: var(--color-error);
          border-top: 1px solid var(--color-gray-200);
        }
        .mobile-menu-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-gray-600);
          display: block;
        }
        .mobile-menu {
          position: fixed;
          top: 4rem;
          left: 0;
          right: 0;
          background: var(--color-white);
          box-shadow: var(--shadow-lg);
          z-index: 999;
          padding: 1.25rem 0;
          border-top: 1px solid var(--color-gray-100);
        }
        .mobile-search {
          margin-bottom: 1rem;
        }
        .mobile-search-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--color-gray-200);
          border-radius: var(--radius-lg);
          font-size: 0.9rem;
          outline: none;
        }
        .mobile-nav-link {
          display: block;
          padding: 0.75rem 0;
          text-decoration: none;
          color: var(--color-gray-700);
          font-weight: 500;
          transition: color 0.2s;
        }
        .mobile-nav-link:hover {
          color: var(--color-primary);
        }
        .mobile-menu-divider {
          height: 1px;
          background: var(--color-gray-200);
          margin: 0.75rem 0;
        }
        .logout-mobile {
          color: var(--color-error);
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .nav-links-desktop {
            display: flex;
          }
          .search-form-desktop {
            display: block;
          }
          .mobile-menu-btn {
            display: none;
          }
          .user-name {
            display: inline;
          }
          .chevron-icon {
            display: inline;
          }
        }
        @media (max-width: 1024px) {
          .brand-link {
            margin-right: 1.5rem;
          }
          .nav-links-desktop {
            gap: 1.5rem;
          }
          .search-form-desktop {
            max-width: 350px;
            margin: 0 1rem;
          }
        }
      `}</style>
    </>
  )
}

export default Navbar