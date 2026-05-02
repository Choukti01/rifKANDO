import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const [scrolled, setScrolled] = useState(false)

  // Detect when footer is visible to enhance glass effect
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const distanceToBottom = documentHeight - (scrollTop + windowHeight)
      
      // Show stronger glass effect when near bottom
      setScrolled(distanceToBottom < 300)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    <footer className={`footer ${scrolled ? 'footer-visible' : ''}`}>
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
                rif<span className="footer-logo-accent">KANDO</span>
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
          <p>&copy; {currentYear} rifKANDO. All rights reserved.</p>
        </div>
      </div>

      <style>{`
        .footer {
          /* Dark glass effect - black with transparency */
          background:rgba(8, 8, 12, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: var(--color-gray-400);
          padding: 3rem 0 1.5rem;
          margin-top: auto;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s ease;
        }

        /* When scrolled near footer - stronger glass effect */
        .footer.footer-visible {
          background:rgba(8, 8, 12, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top-color: rgba(255, 255, 255, 0.1);
        }

        /* Light mode support (if user prefers light, keep dark but adjust) */
        @media (prefers-color-scheme: light) {
          .footer {
            background: rgba(20, 20, 25, 0.88);
          }
          .footer.footer-visible {
            background: rgba(15, 15, 20, 0.94);
          }
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
          color: rgba(255, 255, 255, 0.6);
        }

        .footer-section-title {
          color: white;
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 1rem;
          letter-spacing: -0.3px;
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
          color: rgba(255, 255, 255, 0.55);
          text-decoration: none;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          display: inline-block;
        }

        .footer-link:hover {
          color: var(--color-primary);
          transform: translateX(4px);
        }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 1.5rem;
          text-align: center;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
        }

        /* When footer is visible (scrolled near bottom) */
        .footer-visible .footer-bottom {
          border-top-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </footer>
  )
}

export default Footer