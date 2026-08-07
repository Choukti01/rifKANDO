import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const { t } = useTranslation()
  const [footerVisible, setFooterVisible] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const distanceToBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)

      setFooterVisible(distanceToBottom < 300)
      setShowBackToTop(window.scrollY > 300)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sections = [
    {
      title: t('footer.marketplace'),
      links: [
        { name: t('nav.products'), path: '/products' },
        { name: t('nav.courses'), path: '/courses' },
        { name: t('nav.services'), path: '/services' },
        { name: t('nav.digital'), path: '/digital' },
        { name: t('nav.bookings'), path: '/bookings' },
      ],
    },
    {
      title: t('footer.sellers'),
      links: [
        { name: t('footer.startSelling'), path: '/choose-seller-type' },
        { name: t('footer.sellerGuidelines'), path: '/seller-guidelines' },
        { name: t('footer.pricing'), path: '/pricing' },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { name: t('footer.helpCenter'), path: '/help' },
        { name: t('footer.contactUs'), path: '/contact' },
        { name: t('footer.terms'), path: '/terms' },
        { name: t('footer.privacy'), path: '/privacy' },
      ],
    },
  ]

  return (
    <>
      <footer className={`footer ${footerVisible ? 'footer-visible' : ''}`}>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="footer-logo" aria-label="rifKANDO home">
                <span className="footer-logo-icon">
                  <img src="/logo.png" alt="" className="footer-logo-img" />
                </span>
                <span className="footer-logo-name">
                  rif<span className="footer-logo-accent">KANDO</span>
                </span>
              </Link>
              <p className="footer-kicker">{t('footer.kicker')}</p>
              <p className="footer-description">{t('footer.description')}</p>
              <div className="footer-promise" aria-label="What you can do on rifKANDO">
                <span>{t('footer.shop')}</span>
                <span>{t('footer.learn')}</span>
                <span>{t('footer.hire')}</span>
                <span>{t('footer.book')}</span>
              </div>
              <div className="footer-social">
                <a href="https://www.facebook.com/share/1JKtSWNcUQ/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.99h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.99C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/rifkando212?igsh=aHNwa3UxZm52NG44" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 110 2.881 1.44 1.44 0 010-2.881z" />
                  </svg>
                </a>
              </div>
            </div>

            {sections.map((section) => (
              <section key={section.title} className="footer-section" aria-labelledby={`footer-${section.title.replace(/\s+/g, '-').toLowerCase()}`}>
                <h2 id={`footer-${section.title.replace(/\s+/g, '-').toLowerCase()}`} className="footer-section-title">{section.title}</h2>
                <ul className="footer-links">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link to={link.path} className="footer-link">{link.name}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="footer-bottom">
            <p>&copy; {currentYear} rifKANDO. {t('common.allRightsReserved')}</p>
            <button type="button" className="footer-top-link" onClick={scrollToTop}>
              {t('common.backToTop')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </footer>

      {showBackToTop && (
        <button type="button" className="back-to-top-btn" onClick={scrollToTop} aria-label={t('common.backToTop')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      )}

      <style>{`
        .footer {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          margin-top: auto;
          padding: clamp(3.5rem, 7vw, 5.5rem) 0 1.25rem;
          color: rgba(26, 26, 26, 0.78);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.32)),
            linear-gradient(120deg, var(--color-primary), var(--color-primary-light));
          border-top: 1px solid rgba(95, 158, 160, 0.48);
          box-shadow: 0 -18px 50px rgba(95, 158, 160, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(20px) saturate(145%);
          -webkit-backdrop-filter: blur(20px) saturate(145%);
          transition: background 240ms ease, border-color 240ms ease;
        }

        .footer::before,
        .footer::after {
          content: '';
          position: absolute;
          z-index: -1;
          pointer-events: none;
        }

        .footer::before {
          inset: 0;
          background:
            radial-gradient(circle at 6% 5%, rgba(255, 255, 255, 0.78), transparent 24rem),
            radial-gradient(circle at 94% 78%, rgba(95, 158, 160, 0.24), transparent 26rem),
            linear-gradient(135deg, rgba(255, 255, 255, 0.38), transparent 36%);
        }

        .footer::after {
          top: 0;
          right: 0;
          left: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(26, 26, 26, 0.26), transparent);
        }

        .footer.footer-visible {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.4)),
            linear-gradient(120deg, var(--color-primary), var(--color-primary-light));
          border-top-color: rgba(95, 158, 160, 0.62);
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem 2rem;
          padding-bottom: 2.75rem;
        }

        .footer-brand {
          max-width: 21rem;
        }

        .footer-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          color: #f8fbfd;
          text-decoration: none;
        }

        .footer-logo-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
        }

        .footer-logo-img {
          width: 240%;
          max-width: none;
          height: 240%;
          object-fit: contain;
        }

        .footer-logo-name {
          color: var(--color-black);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.045em;
        }

        .footer-logo-accent {
          color: var(--color-primary);
        }

        .footer-kicker {
          margin: 0 0 0.7rem;
          color: rgba(26, 26, 26, 0.76);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          line-height: 1.4;
        }

        .footer-description {
          margin: 0;
          color: rgba(26, 26, 26, 0.74);
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .footer-promise {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin: 1.3rem 0 1.45rem;
        }

        .footer-promise span {
          padding: 0.38rem 0.65rem;
          color: rgba(26, 26, 26, 0.8);
          background: rgba(255, 255, 255, 0.52);
          border: 1px solid rgba(95, 158, 160, 0.32);
          border-radius: var(--radius-full);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
          font-size: 0.72rem;
          font-weight: 600;
        }

        .footer-social {
          display: flex;
          gap: 0.65rem;
        }

        .footer-social-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          color: rgba(26, 26, 26, 0.8);
          background: rgba(255, 255, 255, 0.52);
          border: 1px solid rgba(95, 158, 160, 0.32);
          border-radius: 0.75rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.56);
          transition: transform 180ms ease, color 180ms ease, background 180ms ease, border-color 180ms ease;
        }

        .footer-social-link svg {
          width: 1.1rem;
          height: 1.1rem;
        }

        .footer-social-link:hover {
          color: var(--color-black);
          background: var(--color-white);
          border-color: rgba(95, 158, 160, 0.54);
          transform: translateY(-3px);
        }

        .footer-section {
          min-width: 0;
        }

        .footer-section-title {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          margin: 0 0 1rem;
          color: var(--color-black);
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: -0.015em;
        }

        .footer-section-title::before {
          width: 1.2rem;
          height: 2px;
          background: var(--color-primary);
          border-radius: var(--radius-full);
          content: '';
        }

        .footer-links {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .footer-link {
          position: relative;
          display: inline-block;
          width: fit-content;
          padding: 0.3rem 0;
          color: rgba(26, 26, 26, 0.72);
          font-size: 0.875rem;
          line-height: 1.55;
          text-decoration: none;
          transition: color 180ms ease;
        }

        .footer-link::after {
          position: absolute;
          right: 0;
          bottom: 0.2rem;
          left: 0;
          width: 0;
          height: 1px;
          background: var(--color-primary);
          content: '';
          transition: width 180ms ease;
        }

        .footer-link:hover {
          color: var(--color-black);
        }

        .footer-link:hover::after {
          width: 100%;
        }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 1.35rem;
          border-top: 1px solid rgba(26, 26, 26, 0.16);
          color: rgba(26, 26, 26, 0.64);
          font-size: 0.78rem;
        }

        .footer-bottom p {
          margin: 0;
          color: inherit;
        }

        .footer-top-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0;
          color: var(--color-black);
          background: transparent;
          border: 0;
          cursor: pointer;
          font: inherit;
          font-weight: 600;
          transition: color 180ms ease, transform 180ms ease;
        }

        .footer-top-link svg {
          width: 1rem;
          height: 1rem;
        }

        .footer-top-link:hover {
          color: var(--color-black);
          transform: translateY(-2px);
        }

        .footer-social-link:focus-visible,
        .footer-link:focus-visible,
        .footer-logo:focus-visible,
        .footer-top-link:focus-visible,
        .back-to-top-btn:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 4px;
        }

        .back-to-top-btn {
          position: fixed;
          right: 1rem;
          bottom: 1.25rem;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.85rem;
          height: 2.85rem;
          color: #06111a;
          background: rgba(176, 224, 230, 0.93);
          border: 1px solid rgba(255, 255, 255, 0.56);
          border-radius: 0.9rem;
          box-shadow: 0 10px 24px rgba(3, 8, 15, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.55);
          cursor: pointer;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }

        .back-to-top-btn svg {
          width: 1.3rem;
          height: 1.3rem;
        }

        .back-to-top-btn:hover {
          background: #ffffff;
          box-shadow: 0 14px 30px rgba(3, 8, 15, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.7);
          transform: translateY(-3px);
        }

        @media (min-width: 640px) {
          .footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .footer-brand {
            grid-column: span 2;
          }
        }

        @media (min-width: 1024px) {
          .footer-grid {
            grid-template-columns: minmax(14rem, 1.7fr) repeat(3, minmax(7.5rem, 0.8fr));
            gap: 2rem clamp(1.5rem, 4vw, 4rem);
          }

          .footer-brand {
            grid-column: auto;
          }

          .back-to-top-btn {
            right: 2rem;
            bottom: 2rem;
          }
        }

        @media (max-width: 639px) {
          .footer-grid {
            gap: 2.25rem;
          }

          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .footer-top-link {
            min-height: 2.75rem;
          }

          .footer-social-link {
            width: 2.75rem;
            height: 2.75rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .footer,
          .footer-social-link,
          .footer-link,
          .footer-link::after,
          .footer-top-link,
          .back-to-top-btn {
            transition: none;
          }
        }
      `}</style>
    </>
  )
}

export default Footer
