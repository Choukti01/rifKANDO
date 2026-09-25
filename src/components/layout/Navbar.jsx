import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, UserIcon, Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();

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

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  const navLinks = [
    { name: t('nav.products'), path: '/products' },
    { name: t('nav.courses'), path: '/courses' },
    { name: t('nav.services'), path: '/services' },
    { name: t('nav.digital'), path: '/digital' },
    { name: t('findit.navigation'), path: '/findit' },
  ];
  const isSeller = user?.role === 'seller' || user?.roles?.includes('seller');
  const isOperationsTeam = ['operations', 'finance', 'admin', 'super_admin'].includes(user?.role);
  const accountPath = isSeller ? '/seller/dashboard' : '/profile';
  const accountLabel = isSeller ? t('common.sellerDashboard') : t('common.profile');

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container">
          <div className="navbar-content">
            {/* Brand */}
            <Link to="/" className="brand-link" aria-label="rifKANDO home">
              <img
                src="/assets/rifkando-navbar-lockup.png"
                alt="rifKANDO"
                className="brand-lockup-image"
              />
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
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </form>

            {/* Icons */}
            <div className="nav-icons">
              {/* Language Switcher (now only EN/AR) */}
              <div className="desktop-language-switcher"><LanguageSwitcher /></div>

              {/* Profile Dropdown */}
              <div className="profile-dropdown desktop-profile-dropdown" ref={dropdownRef}>
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="nav-icon profile-btn" aria-label={t('common.accountMenu')} aria-expanded={isProfileOpen} aria-haspopup="menu">
                  <UserIcon className="icon" />
                  {isAuthenticated && user && <span className="user-name">{user.name?.split(' ')[0]}</span>}
                  <ChevronDownIcon className="chevron-icon" />
                </button>
                {isProfileOpen && (
                  <div className="dropdown-menu" role="menu">
                    {isAuthenticated ? (
                      <>
                        <div className="dropdown-header">
                          <p className="dropdown-name">{user?.name}</p>
                          <p className="dropdown-email">{user?.email}</p>
                        </div>
                        <Link to={accountPath} className="dropdown-item" onClick={() => setIsProfileOpen(false)}>{accountLabel}</Link>
                        <Link to="/orders" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>{t('common.myOrders')}</Link>
                        <Link to="/findit/dashboard" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>{t('common.myFinditRequests')}</Link>
                        {isOperationsTeam && <Link to="/operations/cod" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>COD Operations Desk</Link>}
                        {!isSeller && <>
                          <Link to="/favorites" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>{t('common.savedItems')}</Link>
                          <Link to="/cart" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>{t('nav.cart')}</Link>
                          <Link to="/choose-seller-type" className="dropdown-item seller-link" onClick={() => setIsProfileOpen(false)}>{t('common.becomeSeller')}</Link>
                        </>}
                        <button onClick={handleLogout} className="dropdown-item logout-btn">{t('common.logout')}</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>{t('common.login')}</Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="mobile-menu-btn" aria-label={isMenuOpen ? t('common.closeMenu') : t('common.openMenu')} aria-controls="mobile-navigation" aria-expanded={isMenuOpen}>
                {isMenuOpen ? <XMarkIcon className="icon" /> : <Bars3Icon className="icon" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div id="mobile-navigation" className="mobile-menu">
          <div className="container">
            <form onSubmit={handleSearch} className="mobile-search">
              <input
                type="text"
                placeholder={t('common.search')}
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
            {/* Language Switcher in mobile menu */}
            <div className="mobile-lang-section">
              <LanguageSwitcher />
            </div>
            {isAuthenticated ? (
              <>
                <Link to={accountPath} className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>{accountLabel}</Link>
                <Link to="/orders" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>{t('common.myOrders')}</Link>
                <Link to="/findit/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>{t('common.myFinditRequests')}</Link>
                {isOperationsTeam && <Link to="/operations/cod" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>COD Operations Desk</Link>}
                {!isSeller && <>
                  <Link to="/favorites" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>{t('common.savedItems')}</Link>
                  <Link to="/cart" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>{t('nav.cart')}</Link>
                </>}
                <button onClick={handleLogout} className="mobile-nav-link logout-mobile">{t('common.logout')}</button>
              </>
            ) : (
              <>
                <Link to="/login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>{t('common.signIn', 'Sign in')}</Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        :root {
          --glass-bg: rgba(255, 255, 255, 0.75);
          --glass-bg-scrolled: rgba(255, 255, 255, 0.85);
          --glass-border: rgba(255, 255, 255, 0.2);
          --glass-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          --glass-shadow-scrolled: 0 8px 30px rgba(0, 0, 0, 0.08);
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
          text-decoration: none;
          flex-shrink: 0;
          position: relative;
          width: 10.5rem;
          height: 2.5rem;
          overflow: hidden;
        }

        .brand-lockup-image {
          position: absolute;
          top: 50%;
          left: 50%;
          display: block;
          width: 100%;
          max-width: none;
          height: auto;
          transform: translate(-50%, -50%);
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

        /* SEARCH BAR - FIXED ALIGNMENT */
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
          gap: 1.25rem;
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
        }

        .desktop-language-switcher,
        .desktop-profile-dropdown {
          display: block;
        }

        .mobile-menu {
          position: fixed;
          top: 4rem;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(16px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          z-index: 999;
          padding: 1.25rem 0;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          animation: slideDown 0.3s ease;
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

        /* Keep the compact navigation as the same light glass surface as desktop. */
        @media (max-width: 767px) {
          .navbar {
            --glass-bg: rgba(255, 255, 255, 0.32);
            --glass-bg-scrolled: rgba(255, 255, 255, 0.48);
            --glass-border: rgba(255, 255, 255, 0.52);
            padding: 0.6rem 0;
            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(160%);
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.045);
          }
          .navbar.navbar-scrolled {
            backdrop-filter: blur(22px) saturate(165%);
            -webkit-backdrop-filter: blur(22px) saturate(165%);
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
          }
          .navbar .nav-icon,
          .navbar .mobile-menu-btn {
            color: #374151;
          }
          .navbar-content {
            gap: 0.5rem;
          }
          .brand-link {
            width: 8.25rem;
            height: 2rem;
          }
          .nav-icons {
            gap: 0.2rem;
          }
          .nav-icon,
          .mobile-menu-btn {
            display: inline-flex;
            width: 2.75rem;
            min-width: 2.75rem;
            height: 2.75rem;
            align-items: center;
            justify-content: center;
            border-radius: 0.75rem;
          }
          .desktop-language-switcher,
          .desktop-profile-dropdown {
            display: none;
          }
          .mobile-menu {
            top: 62px;
            max-height: calc(100dvh - 62px);
            overflow-y: auto;
            overscroll-behavior: contain;
            background: rgba(255, 255, 255, 0.46);
            backdrop-filter: blur(22px) saturate(155%);
            -webkit-backdrop-filter: blur(22px) saturate(155%);
            border-top: 1px solid rgba(255, 255, 255, 0.58);
            border-bottom: 1px solid rgba(17, 24, 39, 0.07);
            box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
          }
          .mobile-search-input {
            background: rgba(255, 255, 255, 0.42);
            border-color: rgba(17, 24, 39, 0.1);
          }
          .mobile-nav-link {
            min-height: 2.75rem;
            padding: 0.8rem 0;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;
