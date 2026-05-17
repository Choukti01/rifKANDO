import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, ShoppingBagIcon, HeartIcon, UserIcon, Bars3Icon, XMarkIcon, ChevronDownIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LanguageSwitcher from '../LanguageSwitcher';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsMenuOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isProfileOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/messages/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  const navLinks = [
    { name: 'Products', path: '/products' },
    { name: 'Courses', path: '/courses' },
    { name: 'Services', path: '/services' },
    { name: 'Digital', path: '/digital' },
    { name: 'Bookings', path: '/bookings' },
  ];

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container">
          <div className="navbar-content">
            {/* Logo and Brand */}
            <Link to="/" className="brand-link">
              <div className="logo-icon">
                <img src="/logo.png" alt="rifKANDO" className="logo-img" />
              </div>
              <span className="brand-name">rif<span className="brand-accent">KANDO</span></span>
            </Link>

            {/* Desktop Navigation */}
            <div className="nav-links-desktop">
              {navLinks.map(link => (
                <Link key={link.name} to={link.path} className="nav-link">
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Search Bar - FIXED ALIGNMENT */}
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
              <Link to="/favorites" className="nav-icon"><HeartIcon className="icon" /></Link>
              <Link to="/cart" className="nav-icon"><ShoppingBagIcon className="icon" /></Link>
              <Link to="/messages" className="nav-icon">
                <ChatBubbleLeftIcon className="icon" />
                {unreadCount > 0 && <span className="unread-badge-nav">{unreadCount}</span>}
              </Link>

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Profile Dropdown */}
              <div className="profile-dropdown" ref={dropdownRef}>
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="nav-icon profile-btn">
                  <UserIcon className="icon" />
                  {isAuthenticated && user && <span className="user-name">{user.name?.split(' ')[0]}</span>}
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
                        <Link to="/seller/dashboard" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>My Profile</Link>
                        <Link to="/orders" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>My Orders</Link>
                        <Link to="/favorites" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>Favorites</Link>
                        <Link to="/choose-seller-type" className="dropdown-item seller-link" onClick={() => setIsProfileOpen(false)}>Become a Seller</Link>
                        <button onClick={handleLogout} className="dropdown-item logout-btn">Logout</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>Login</Link>
                        <Link to="/register" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>Register</Link>
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
      <div className={`mobile-menu ${!isMenuOpen ? 'closed' : ''}`}>
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
            <Link key={link.name} to={link.path} className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              {link.name}
            </Link>
          ))}
          <div className="mobile-menu-divider"></div>
          <div className="mobile-lang-section">
            <LanguageSwitcher />
          </div>
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

      {/* Overlay */}
      <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)} />

      <style>{`
        :root {
          --glass-bg: rgba(255, 255, 255, 0.75);
          --glass-bg-scrolled: rgba(255, 255, 255, 0.85);
          --glass-border: rgba(255, 255, 255, 0.2);
          --glass-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          --glass-shadow-scrolled: 0 8px 30px rgba(0, 0, 0, 0.08);
        }

        /* Overlay */
        .menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 998;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .menu-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--glass-border);
          z-index: 1000;
          padding: 0.75rem 0;
          transition: all 0.3s ease;
        }

        .navbar.navbar-scrolled {
          background: var(--glass-bg-scrolled);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: var(--glass-shadow-scrolled);
          border-bottom-color: rgba(0, 0, 0, 0.05);
        }

        @media (prefers-color-scheme: dark) {
          .navbar {
            --glass-bg: rgba(10, 10, 10, 0.75);
            --glass-bg-scrolled: rgba(10, 10, 10, 0.85);
            --glass-border: rgba(255, 255, 255, 0.08);
          }
          .navbar .brand-name,
          .navbar .nav-link,
          .navbar .nav-icon {
            color: #e5e5e5;
          }
          .search-input {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.1);
            color: white;
          }
          .search-input:focus {
            background: rgba(255, 255, 255, 0.12);
            border-color: var(--color-primary);
          }
          .search-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .dropdown-menu {
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .dropdown-item {
            color: #e5e5e5;
          }
          .dropdown-item:hover {
            background: rgba(255, 255, 255, 0.08);
          }
          .mobile-menu {
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(12px);
          }
          .mobile-nav-link {
            color: #e5e5e5;
          }
          .mobile-search-input {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.1);
            color: white;
          }
          .mobile-search-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
        }

        .navbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          flex-shrink: 0;
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
          transition: color 0.2s;
        }

        .brand-accent {
          color: var(--color-primary);
        }

        .nav-links-desktop {
          display: none;
          align-items: center;
          gap: 2rem;
        }

        .nav-link {
          text-decoration: none;
          color: var(--color-gray-600);
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.2s;
          padding: 0.5rem 0;
          position: relative;
          white-space: nowrap;
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
          transition: width 0.2s ease;
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .search-form-desktop {
          display: none;
          flex: 1;
          max-width: 400px;
          min-width: 200px;
        }

        .search-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1rem;
          height: 1rem;
          color: #9ca3af;
          pointer-events: none;
          z-index: 1;
        }

        .search-input {
          width: 100%;
          height: 40px;
          padding: 0.5rem 1rem 0.5rem 2.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 2rem;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.8);
          color: #1f2937;
          line-height: normal;
        }

        .search-input:focus {
          border-color: #87CEEB;
          background: white;
          box-shadow: 0 0 0 3px rgba(135, 206, 235, 0.15);
        }

        .search-input::placeholder {
          color: #9ca3af;
          font-size: 0.8rem;
        }

        .nav-icons {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-shrink: 0;
        }

        .nav-icon {
          position: relative;
          color: #4b5563;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
        }

        .nav-icon:hover {
          color: #87CEEB;
          transform: translateY(-1px);
        }

        .icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .unread-badge-nav {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          font-size: 0.6rem;
          font-weight: bold;
          padding: 0.125rem 0.375rem;
          border-radius: 1rem;
          min-width: 16px;
          text-align: center;
        }

        .user-name {
          font-size: 0.875rem;
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
          margin-top: 0.75rem;
          width: 240px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(8px);
          border-radius: 1rem;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          z-index: 100;
          overflow: hidden;
          animation: fadeInDown 0.2s ease;
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dropdown-header {
          padding: 0.875rem 1rem;
          border-bottom: 1px solid #f3f4f6;
          background: rgba(0, 0, 0, 0.02);
        }

        .dropdown-name {
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .dropdown-email {
          font-size: 0.7rem;
          color: #6b7280;
        }

        .dropdown-item {
          display: block;
          padding: 0.7rem 1rem;
          font-size: 0.875rem;
          color: #374151;
          text-decoration: none;
          transition: background 0.2s;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
        }

        .dropdown-item:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .seller-link {
          color: #87CEEB;
          border-top: 1px solid #f3f4f6;
          margin-top: 0.25rem;
        }

        .logout-btn {
          color: #ef4444;
          border-top: 1px solid #f3f4f6;
        }

        .mobile-menu-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #4b5563;
          display: block;
          margin-left: 0;
          padding: 0.5rem;
        }

        .mobile-menu {
          position: fixed;
          top: 4rem;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(16px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          z-index: 999;
          padding: 1.25rem 0;
          transform: translateX(0);
          transition: transform 0.3s ease;
          overflow-y: auto;
        }

        .mobile-menu.closed {
          transform: translateX(-100%);
          display: none;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mobile-search {
          margin-bottom: 1rem;
        }

        .mobile-search-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 2rem;
          font-size: 0.875rem;
          outline: none;
          background: rgba(0, 0, 0, 0.03);
        }

        .mobile-search-input:focus {
          border-color: #87CEEB;
          background: white;
        }

        .mobile-nav-link {
          display: block;
          padding: 0.75rem 0;
          text-decoration: none;
          color: #374151;
          font-weight: 500;
          transition: color 0.2s;
          font-size: 1rem;
        }

        .mobile-nav-link:hover {
          color: #87CEEB;
        }

        .mobile-menu-divider {
          height: 1px;
          background: #f3f4f6;
          margin: 0.75rem 0;
        }

        .mobile-lang-section {
          padding: 0.5rem 0;
          margin-bottom: 0.5rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .logout-mobile {
          color: #ef4444;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
        }

        .language-switcher {
          display: flex;
          gap: 0.25rem;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 2rem;
          padding: 0.2rem;
          margin: 0 0.5rem;
        }
        .lang-btn {
          background: transparent;
          border: none;
          padding: 0.3rem 0.65rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #4b5563;
        }
        .lang-btn.active {
          background: #87CEEB;
          color: #1a1a1a;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .lang-btn:hover:not(.active) {
          background: rgba(135, 206, 235, 0.2);
          color: #87CEEB;
        }
        @media (prefers-color-scheme: dark) {
          .lang-btn {
            color: #e5e5e5;
          }
          .lang-btn.active {
            background: #87CEEB;
            color: #1a1a1a;
          }
        }
        .mobile-lang-section .language-switcher {
          margin: 0;
          justify-content: center;
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

        @media (min-width: 1280px) {
          .search-form-desktop {
            max-width: 450px;
          }
          .nav-links-desktop {
            gap: 2.5rem;
          }
        }

        @media (max-width: 1024px) {
          .brand-link {
            margin-right: 0;
          }
          .nav-links-desktop {
            gap: 1rem;
          }
          .search-form-desktop {
            max-width: 220px;
          }
          .search-input {
            font-size: 0.75rem;
          }
          .search-input::placeholder {
            font-size: 0.7rem;
          }
        }

        @media (max-width: 900px) {
          .search-form-desktop {
            max-width: 180px;
          }
          .nav-links-desktop {
            gap: 0.75rem;
          }
          .nav-link {
            font-size: 0.85rem;
          }
        }

        /* Ensure the hamburger is visible on very small screens */
        @media (max-width: 480px) {
          .nav-icons {
            gap: 0.5rem;
          }
          .mobile-menu-btn {
            padding: 0.25rem;
          }
          .brand-name {
            font-size: 1.2rem;
          }
          .logo-icon {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;