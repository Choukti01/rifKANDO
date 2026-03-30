import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, ShoppingBagIcon, HeartIcon, UserIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
      setIsMenuOpen(false)
    }
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
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="logo-icon">
                <span className="logo-text">R</span>
              </div>
              <span className="logo-name">
                Rif<span className="logo-name-accent">KANDI</span>
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
              <Link to="/login" className="nav-icon nav-icon-desktop">
                <UserIcon className="icon" />
              </Link>
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
            <Link to="/login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Login</Link>
            <Link to="/register" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Register</Link>
          </div>
        </div>
      )}

      <style>{`
        /* Navbar */
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

        /* Logo */
        .logo-icon {
          width: 36px;
          height: 36px;
          background: var(--color-primary);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-text {
          font-weight: bold;
          font-size: 1.2rem;
          color: var(--color-black);
        }
        .logo-name {
          font-size: 1.3rem;
          font-weight: bold;
          color: var(--color-black);
        }
        .logo-name-accent {
          color: var(--color-primary);
        }

        /* Desktop Navigation */
        .nav-links-desktop {
          display: none;
          align-items: center;
          gap: 1.8rem;
        }
        .nav-link {
          text-decoration: none;
          color: var(--color-gray-600);
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: var(--color-primary);
        }

        /* Search Form */
        .search-form-desktop {
          display: none;
          flex: 1;
          max-width: 500px;
          margin: 0 1rem;
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
          padding: 0.65rem 1rem 0.65rem 2.5rem;
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

        /* Icons */
        .nav-icons {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .nav-icon {
          color: var(--color-gray-600);
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }
        .nav-icon:hover {
          color: var(--color-primary);
        }
        .icon {
          width: 1.25rem;
          height: 1.25rem;
        }
        .mobile-menu-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-gray-600);
          display: block;
        }

        /* Mobile Menu */
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

        /* Desktop Styles */
        @media (min-width: 768px) {
          .nav-links-desktop {
            display: flex;
          }
          .search-form-desktop {
            display: block;
          }
          .nav-icon-desktop {
            display: block;
          }
          .mobile-menu-btn {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

export default Navbar