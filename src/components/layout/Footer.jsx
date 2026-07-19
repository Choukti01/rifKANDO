import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const [scrolled, setScrolled] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const distanceToBottom = documentHeight - (scrollTop + windowHeight)
      
      // Show stronger glass effect when near bottom
      setScrolled(distanceToBottom < 300)
      // Show back-to-top button after scrolling 300px from top
      setShowBackToTop(scrollTop > 300)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
    <>
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
                <span className="footer-logo-name" aria-label="rifKANDO">
                  rif<span className="footer-logo-accent">KANDO</span>
                </span>
              </div>
              <p className="footer-kicker">ONE PLACE. MANY POSSIBILITIES.</p>
              <p className="footer-description">
                Morocco's first multi-service platform. Buy products, take courses, hire professionals, all in one place.
              </p>
              <div className="footer-promise" aria-label="What you can do on rifKANDO">
                <span>Shop</span><span>Learn</span><span>Hire</span><span>Book</span>
              </div>
              {/* Social Icons - Added for mobile */}
              <div className="footer-social">
                <a href="#" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="WhatsApp">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.567 1.085 3.649l-1.084 3.853 3.934-1.078c1.032.574 2.176.877 3.344.877 3.18 0 5.767-2.586 5.768-5.766.001-3.18-2.585-5.767-5.765-5.768h-.004z"/>
                  </svg>
                </a>
                <a href="https://www.facebook.com/share/1JKtSWNcUQ/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.99h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.99C18.343 21.128 22 16.991 22 12z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/rifkando212?igsh=aHNwa3UxZm52NG44" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 110 2.881 1.44 1.44 0 010-2.881z"/>
                  </svg>
                </a>
              </div>
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
            <p>&copy; {currentYear} <span className="footer-bottom-brand">rif<span>KANDO</span></span>. All rights reserved.</p>
            <button type="button" className="footer-top-link" onClick={scrollToTop}>Back to top ↑</button>
          </div>
        </div>
      </footer>

      {/* Back to Top Button (floating) */}
      {showBackToTop && (
        <button className="back-to-top-btn" onClick={scrollToTop} aria-label="Back to top">
          ↑
        </button>
      )}

      <style>{`
        .footer {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background: #090d16;
          color: var(--color-gray-400);
          padding: 4.5rem 0 1.25rem;
          margin-top: auto;
          border-top: 1px solid rgba(135, 206, 235, 0.28);
          transition: all 0.3s ease;
        }

        .footer::before {
          content: '';
          position: absolute;
          z-index: -1;
          inset: 0;
          background:
            radial-gradient(circle at 9% 9%, rgba(135, 206, 235, 0.22), transparent 25rem),
            radial-gradient(circle at 92% 78%, rgba(59, 130, 246, 0.18), transparent 25rem),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: auto, auto, 34px 34px, 34px 34px;
          pointer-events: none;
        }

        .footer.footer-visible {
          background: #070a11;
          border-top-color: rgba(135, 206, 235, 0.45);
        }

        @media (prefers-color-scheme: light) {
          .footer {
          background: #090d16;
          }
          .footer.footer-visible {
          background: #070a11;
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
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: fit-content;
          padding: 0.6rem 1rem 0.6rem 0.6rem;
          margin-bottom: 1.1rem;
          border: 1px solid rgba(255, 255, 255, 0.62);
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(255,255,255,0.72), rgba(220,243,255,0.45));
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.72);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .footer-logo::before {
          content: '';
          position: absolute;
          top: -90%;
          right: -16%;
          width: 78%;
          height: 220%;
          border-radius: 50%;
          background: rgba(255,255,255,0.28);
          transform: rotate(24deg);
          pointer-events: none;
        }

        .footer-logo:hover {
          transform: translateY(-3px) rotate(-1deg);
          box-shadow: 0 20px 42px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.84);
        }

        .footer-logo > * {
          position: relative;
          z-index: 1;
        }

        .footer-logo-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .footer-logo-img {
          width: 250%;
          height: 250%;
          object-fit: contain;
        }

        .footer-logo-name {
          font-size: 1.5rem;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.055em;
        }

        .footer-logo-accent { color: var(--color-primary); }

        .footer-kicker {
          margin: 0 0 0.65rem;
          color: var(--color-primary);
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .footer-description {
          font-size: 0.875rem;
          line-height: 1.5;
          max-width: 250px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 1rem;
        }

        .footer-promise {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin: 1.1rem 0 1.25rem;
        }

        .footer-promise span {
          padding: 0.38rem 0.65rem;
          border: 1px solid rgba(135, 206, 235, 0.28);
          border-radius: 999px;
          background: rgba(135, 206, 235, 0.08);
          color: rgba(255, 255, 255, 0.84);
          font-size: 0.72rem;
          font-weight: 600;
        }

        .footer-social {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .social-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s;
          text-decoration: none;
        }

        .social-icon svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .social-icon:hover {
          background: var(--color-primary);
          color: white;
          transform: translateY(-2px);
        }

        .footer-section-title {
          color: white;
          font-weight: 700;
          margin-bottom: 1rem;
          font-size: 1rem;
          letter-spacing: -0.02em;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .footer-link {
          color: rgba(255, 255, 255, 0.55);
          text-decoration: none;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          display: inline-block;
          padding: 0.25rem 0;
          min-height: 32px;
        }

        /* Better touch targets on mobile */
        @media (max-width: 768px) {
          .footer-link {
            padding: 0.5rem 0;
            min-height: 44px;
          }
          .social-icon {
            width: 44px;
            height: 44px;
          }
          .footer-grid {
            gap: 1.5rem;
          }
          .footer-bottom {
            font-size: 0.7rem;
            align-items: flex-start;
            grid-template-columns: 1fr;
            justify-items: center;
          }
          .footer-bottom p,
          .footer-top-link {
            grid-column: 1;
            justify-self: center;
          }
        }

        .footer-link:hover {
          color: #ffffff;
          transform: translateX(4px);
        }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 1.5rem;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 1rem;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .footer-bottom p { grid-column: 2; margin: 0; text-align: center; }
        .footer-bottom-brand { color: rgba(255,255,255,0.86); font-weight: 700; }
        .footer-bottom-brand span { color: var(--color-primary); }
        .footer-top-link { grid-column: 3; justify-self: end; border: 0; padding: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; }
        .footer-top-link:hover { color: #ffffff; }

        .footer-visible .footer-bottom {
          border-top-color: rgba(255, 255, 255, 0.1);
        }

        /* Back to Top Button */
        .back-to-top-btn {
          position: fixed;
          bottom: 2rem;
          right: 1rem;
          background: var(--color-primary);
          color: #1a1a1a;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.2s;
          z-index: 1000;
        }

        .back-to-top-btn:hover {
          transform: translateY(-3px);
          background: #5F9EA0;
        }

        @media (min-width: 768px) {
          .back-to-top-btn {
            right: 2rem;
          }
        }
      `}</style>
    </>
  )
}

export default Footer
