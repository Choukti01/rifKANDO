import React from 'react'
import { Link } from 'react-router-dom'
import {
  DocumentTextIcon,
  EyeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const PrivacyPage = () => {
  return (
    <main className="privacy-page">
      <div className="privacy-hero">
        <div className="container">
          <div className="privacy-hero-content">
            <div className="privacy-eyebrow">
              <ShieldCheckIcon aria-hidden="true" />
              <span>Your privacy on rifKANDO</span>
            </div>
            <h1>Clear, respectful handling of your information.</h1>
            <p>
              This policy explains what information rifKANDO collects, why we use it, and the choices you have as a member of our marketplace.
            </p>
            <div className="privacy-meta">
              <span>Last updated: 10 August 2026</span>
              <span aria-hidden="true">•</span>
              <a href="#your-rights">Your privacy choices</a>
            </div>
          </div>
        </div>
      </div>

      <div className="container privacy-layout">
        <aside className="privacy-navigation" aria-label="Privacy policy navigation">
          <p className="privacy-navigation-title">On this page</p>
          <nav>
            <a href="#information">Information we collect</a>
            <a href="#use">How we use information</a>
            <a href="#sharing">When information is shared</a>
            <a href="#security">Security and retention</a>
            <a href="#cookies">Cookies and preferences</a>
            <a href="#your-rights">Your rights</a>
            <a href="#children">Children's privacy</a>
            <a href="#updates">Policy updates</a>
            <a href="#contact">Contact</a>
          </nav>
        </aside>

        <div className="privacy-main-content">
          <section className="privacy-promises" aria-label="Privacy commitments">
            <article>
              <EyeIcon aria-hidden="true" />
              <h2>We do not sell personal information</h2>
              <p>We use information to operate rifKANDO and complete the services you choose.</p>
            </article>
            <article>
              <LockClosedIcon aria-hidden="true" />
              <h2>Access is purpose limited</h2>
              <p>Information is shared only when it is needed to deliver, support, or protect the platform.</p>
            </article>
            <article>
              <UserGroupIcon aria-hidden="true" />
              <h2>You have choices</h2>
              <p>You can ask to access, correct, or delete eligible personal information.</p>
            </article>
          </section>

          <div className="privacy-policy-card">
            <section id="information" className="privacy-section">
              <div className="privacy-section-number">01</div>
              <div>
                <h2>Information we collect</h2>
                <p>We collect information you provide when you create an account, use marketplace features, make a purchase, become a seller, or contact support.</p>
                <div className="privacy-detail-grid">
                  <div>
                    <h3>Account and profile details</h3>
                    <p>Your name, email address, phone number, and profile details.</p>
                  </div>
                  <div>
                    <h3>Marketplace activity</h3>
                    <p>Order, booking, course, service, listing, and support information needed to operate the service.</p>
                  </div>
                  <div>
                    <h3>Payment and payout records</h3>
                    <p>Transaction and wallet records needed to process payments, refunds, withdrawals, and fraud checks.</p>
                  </div>
                  <div>
                    <h3>Seller verification details</h3>
                    <p>Seller workspace choices and account activity needed to operate the marketplace.</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="use" className="privacy-section">
              <div className="privacy-section-number">02</div>
              <div>
                <h2>How we use information</h2>
                <p>We use information to create and secure accounts, complete transactions, provide customer support, communicate important service updates, improve the platform, and help prevent fraud or misuse.</p>
              </div>
            </section>

            <section id="sharing" className="privacy-section">
              <div className="privacy-section-number">03</div>
              <div>
                <h2>When information is shared</h2>
                <p>We do not sell your personal information. We share the minimum information needed with sellers, buyers, and service providers to complete a transaction or booking, process payments, provide support, and operate rifKANDO.</p>
              </div>
            </section>

            <section id="security" className="privacy-section">
              <div className="privacy-section-number">04</div>
              <div>
                <h2>Security and retention</h2>
                <p>We use safeguards such as authenticated access controls, secure sessions, restricted document access, and activity logging to help protect information. No online system can guarantee absolute security, so we continuously review our protections.</p>
                <p>We retain information only for as long as needed to provide the service, meet legal obligations, resolve disputes, and enforce our agreements.</p>
              </div>
            </section>

            <section id="cookies" className="privacy-section">
              <div className="privacy-section-number">05</div>
              <div>
                <h2>Cookies and preferences</h2>
                <p>rifKANDO uses cookies and local browser storage to maintain secure sessions, protect requests, and remember settings such as language preferences. You can manage cookies through your browser settings, but essential platform features may not work correctly if you disable them.</p>
              </div>
            </section>

            <section id="your-rights" className="privacy-section privacy-rights-section">
              <div className="privacy-section-number">06</div>
              <div>
                <h2>Your privacy choices</h2>
                <p>You may ask to access, correct, or delete your personal information, subject to applicable legal and transaction-record retention requirements.</p>
                <Link to="/contact" className="privacy-action">
                  Contact privacy support
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>

            <section id="children" className="privacy-section">
              <div className="privacy-section-number">07</div>
              <div>
                <h2>Children's privacy</h2>
                <p>rifKANDO is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
              </div>
            </section>

            <section id="updates" className="privacy-section">
              <div className="privacy-section-number">08</div>
              <div>
                <h2>Policy updates</h2>
                <p>We may update this policy as rifKANDO evolves. When we do, we will publish the revised version on this page and update the date above.</p>
              </div>
            </section>

            <section id="contact" className="privacy-contact">
              <DocumentTextIcon aria-hidden="true" />
              <div>
                <h2>Privacy questions?</h2>
                <p>Our support team can help with privacy requests or questions about this policy.</p>
              </div>
              <Link to="/contact">Contact us</Link>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .privacy-page { min-height: calc(100vh - 80px); background: #f7fafc; color: #172033; padding-bottom: 5rem; }
        .privacy-hero { background: linear-gradient(128deg, var(--color-brand-ink) 0%, #10233e 58%, var(--color-brand-blue) 145%); color: #fff; overflow: hidden; position: relative; }
        .privacy-hero::after { background: radial-gradient(circle, rgba(255,255,255,.21), transparent 67%); content: ''; height: 32rem; position: absolute; right: -11rem; top: -17rem; width: 32rem; }
        .privacy-hero-content { max-width: 48rem; padding: clamp(4.5rem, 9vw, 7rem) 0 clamp(3.5rem, 7vw, 5rem); position: relative; z-index: 1; }
        .privacy-eyebrow { align-items: center; color: var(--color-primary-light); display: inline-flex; font-size: .82rem; font-weight: 800; gap: .55rem; letter-spacing: .08em; text-transform: uppercase; }
        .privacy-eyebrow svg { height: 1.2rem; width: 1.2rem; }
        .privacy-hero h1 { font-size: clamp(2.35rem, 5vw, 4.25rem); letter-spacing: -.045em; line-height: 1.04; margin: 1.1rem 0; max-width: 44rem; }
        .privacy-hero p { color: var(--color-primary-light); font-size: clamp(1rem, 2vw, 1.2rem); line-height: 1.75; margin: 0; max-width: 43rem; }
        .privacy-meta { align-items: center; color: var(--color-primary-light); display: flex; flex-wrap: wrap; font-size: .9rem; gap: .65rem; margin-top: 1.5rem; }
        .privacy-meta a { color: #fff; font-weight: 700; text-decoration: underline; text-underline-offset: .22rem; }
        .privacy-layout { align-items: start; display: grid; gap: clamp(1.5rem, 4vw, 3.5rem); grid-template-columns: minmax(11rem, 14rem) minmax(0, 1fr); margin-top: clamp(2rem, 5vw, 4rem); }
        .privacy-navigation { position: sticky; top: 6.5rem; }
        .privacy-navigation-title { color: var(--color-brand-ink); font-size: .72rem; font-weight: 800; letter-spacing: .1em; margin: 0 0 .8rem; text-transform: uppercase; }
        .privacy-navigation nav { border-left: 1px solid #d8e2ed; display: flex; flex-direction: column; gap: .2rem; }
        .privacy-navigation a { border-left: 2px solid transparent; color: #5f6d7e; font-size: .88rem; line-height: 1.4; margin-left: -1px; padding: .42rem .75rem; text-decoration: none; transition: border-color .18s ease, color .18s ease; }
        .privacy-navigation a:hover, .privacy-navigation a:focus-visible { border-left-color: var(--color-brand-blue); color: var(--color-brand-ink); outline: none; }
        .privacy-main-content { min-width: 0; }
        .privacy-promises { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 1.25rem; }
        .privacy-promises article { background: #fff; border: 1px solid #e3ebf3; border-radius: 1rem; box-shadow: 0 8px 24px rgba(15, 34, 57, .045); padding: 1.25rem; }
        .privacy-promises svg { color: var(--color-brand-blue); height: 1.35rem; width: 1.35rem; }
        .privacy-promises h2 { font-size: .98rem; line-height: 1.35; margin: .85rem 0 .45rem; }
        .privacy-promises p { color: #64748b; font-size: .84rem; line-height: 1.55; margin: 0; }
        .privacy-policy-card { background: #fff; border: 1px solid #e3ebf3; border-radius: 1.25rem; box-shadow: 0 14px 38px rgba(15, 34, 57, .07); overflow: hidden; }
        .privacy-section { display: grid; gap: 1.2rem; grid-template-columns: 2.25rem minmax(0, 1fr); padding: clamp(1.5rem, 4vw, 2.5rem); scroll-margin-top: 6.5rem; }
        .privacy-section + .privacy-section { border-top: 1px solid #eaf0f6; }
        .privacy-section-number { color: var(--color-brand-ink); font-size: .76rem; font-weight: 850; letter-spacing: .08em; padding-top: .35rem; }
        .privacy-section h2 { color: #132238; font-size: clamp(1.22rem, 2vw, 1.55rem); letter-spacing: -.02em; line-height: 1.25; margin: 0 0 .75rem; }
        .privacy-section p { color: #526174; line-height: 1.75; margin: 0; }
        .privacy-section p + p { margin-top: .85rem; }
        .privacy-detail-grid { display: grid; gap: .8rem; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 1.25rem; }
        .privacy-detail-grid div { background: #f7fafc; border: 1px solid #eaf0f6; border-radius: .8rem; padding: 1rem; }
        .privacy-detail-grid h3 { color: #25405f; font-size: .9rem; margin: 0 0 .35rem; }
        .privacy-detail-grid p { font-size: .85rem; line-height: 1.55; }
        .privacy-rights-section { background: linear-gradient(120deg, #f4faff, #fff); }
        .privacy-action { align-items: center; color: #0d5f9e; display: inline-flex; font-weight: 800; gap: .45rem; margin-top: 1rem; text-decoration: none; }
        .privacy-action span { font-size: 1.15rem; transition: transform .18s ease; }
        .privacy-action:hover span { transform: translateX(3px); }
        .privacy-contact { align-items: center; background: var(--color-brand-ink); color: #fff; display: grid; gap: 1.1rem; grid-template-columns: auto minmax(0, 1fr) auto; padding: clamp(1.5rem, 4vw, 2.2rem); scroll-margin-top: 6.5rem; }
        .privacy-contact > svg { color: var(--color-brand-blue); height: 2.2rem; width: 2.2rem; }
        .privacy-contact h2 { font-size: 1.2rem; margin: 0 0 .25rem; }
        .privacy-contact p { color: var(--color-primary-light); line-height: 1.55; margin: 0; }
        .privacy-contact a { background: #fff; border-radius: .65rem; color: var(--color-brand-ink); font-size: .9rem; font-weight: 800; padding: .75rem 1rem; text-decoration: none; transition: transform .18s ease, box-shadow .18s ease; white-space: nowrap; }
        .privacy-contact a:hover { box-shadow: 0 8px 20px rgba(0, 0, 0, .18); transform: translateY(-2px); }
        @media (max-width: 900px) { .privacy-layout { grid-template-columns: 1fr; } .privacy-navigation { background: #fff; border: 1px solid #e3ebf3; border-radius: .9rem; padding: 1rem; position: static; } .privacy-navigation nav { border-left: 0; flex-direction: row; flex-wrap: wrap; gap: .35rem; } .privacy-navigation a { background: #f7fafc; border: 1px solid #e3ebf3; border-radius: 99px; font-size: .78rem; margin: 0; padding: .42rem .65rem; } .privacy-navigation a:hover, .privacy-navigation a:focus-visible { border-color: var(--color-brand-blue); } }
        @media (max-width: 680px) { .privacy-hero-content { padding: 3.75rem 0 3.2rem; } .privacy-promises { grid-template-columns: 1fr; } .privacy-section { gap: .85rem; grid-template-columns: 1.75rem minmax(0, 1fr); padding: 1.35rem; } .privacy-detail-grid { grid-template-columns: 1fr; } .privacy-contact { align-items: start; grid-template-columns: auto minmax(0, 1fr); } .privacy-contact a { grid-column: 1 / -1; text-align: center; } }
        @media (prefers-reduced-motion: reduce) { .privacy-navigation a, .privacy-action span, .privacy-contact a { transition: none; } }
      `}</style>
    </main>
  )
}

export default PrivacyPage
