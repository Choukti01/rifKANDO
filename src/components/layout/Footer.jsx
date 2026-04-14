import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const sections = [
    {
      title: 'Marketplace',
      links: [
        { name: 'Products', path: '/products' },
        { name: 'Courses', path: '/courses' },
        { name: 'Services', path: '/services' },
        { name: 'Digital', path: '/digital' },
        { name: 'Bookings', path: '/bookings' },
      ]
    },
    {
      title: 'For Sellers',
      links: [
        { name: 'Start Selling', path: '/choose-seller-type' },
        { name: 'Seller Guidelines', path: '/seller-guidelines' },
        { name: 'Pricing', path: '/pricing' },
      ]
    },
    {
      title: 'Support',
      links: [
        { name: 'Help Center', path: '/help' },
        { name: 'Contact Us', path: '/contact' },
        { name: 'Terms of Service', path: '/terms' },
        { name: 'Privacy Policy', path: '/privacy' },
      ]
    }
  ]

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <img 
                  src="/logo.png" 
                  alt="rifKANDI" 
                  className="footer-logo-img"
                />
              </div>
              <span className="footer-logo-name">
                rif<span className="footer-logo-accent">KANDI</span>
              </span>
            </div>
            <p className="footer-description">
              Morocco's first multi-service platform. Buy products, take courses, hire professionals, all in one place.
            </p>
          </div>

          {/* Sections */}
          {sections.map(section => (
            <div key={section.title} className="footer-section">
              <h4 className="footer-section-title">{section.title}</h4>
              <ul className="footer-links">
                {section.links.map(link => (
                  <li key={link.name}>
                    <Link to={link.path} className="footer-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="footer-bottom">
          <p>&copy; {currentYear} rifKANDI. All rights reserved.</p>
        </div>
      </div>

      <style>{`
        .footer {
          background: var(--color-black);
          color: var(--color-gray-400);
          padding: 3rem 0 1.5rem;
          margin-top: auto;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 2rem;
          margin-bottom: 2rem;
        }
        @media (min-width: 640px) {
          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .footer-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .footer-brand {
          grid-column: span 1;
        }
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .footer-logo-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .footer-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .footer-logo-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }
        .footer-logo-accent {
          color: var(--color-primary);
        }
        .footer-description {
          font-size: 0.875rem;
          line-height: 1.5;
          max-width: 250px;
          color: var(--color-gray-400);
        }
        .footer-section-title {
          color: white;
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 1rem;
        }
        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .footer-link {
          color: var(--color-gray-400);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: var(--color-primary);
        }
        .footer-bottom {
          border-top: 1px solid var(--color-gray-800);
          padding-top: 1.5rem;
          text-align: center;
          font-size: 0.8rem;
          color: var(--color-gray-500);
        }
      `}</style>
    </footer>
  )
}

export default Footer