import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  CheckIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import { formatCommissionRate, WITHDRAWAL_HOLD_DAYS } from '../../config/commissionPolicy'

const feeCategories = [
  { type: 'product', label: 'Physical products' },
  { type: 'course', label: 'Courses' },
  { type: 'service', label: 'Services' },
  { type: 'digital', label: 'Digital products' },
  { type: 'booking', label: 'Bookings' },
]

const SellerGuidelines = () => {
  return (
    <main className="seller-guide-page">
      <section className="seller-guide-hero">
        <div className="container seller-guide-hero-grid">
          <div>
            <p className="seller-guide-eyebrow"><ShieldCheckIcon aria-hidden="true" /> Seller guide</p>
            <h1>Build a seller experience customers can trust.</h1>
            <p className="seller-guide-intro">
              A clear guide to setting up, publishing quality listings, managing customer expectations, and understanding how rifKANDO seller fees work.
            </p>
            <div className="seller-guide-actions">
              <Link to="/choose-seller-type" className="seller-guide-primary-action">Become a seller <ArrowRightIcon aria-hidden="true" /></Link>
              <Link to="/pricing" className="seller-guide-secondary-action">View fees and pricing</Link>
            </div>
          </div>
          <div className="seller-guide-hero-card">
            <span>Seller journey</span>
            <ol>
              <li><strong>1</strong> Choose your workspace</li>
              <li><strong>2</strong> Complete your profile</li>
              <li><strong>3</strong> Publish with confidence</li>
            </ol>
          </div>
        </div>
      </section>

      <div className="container seller-guide-layout">
        <aside className="seller-guide-nav" aria-label="Seller guide navigation">
          <p>In this guide</p>
          <a href="#start">Getting started</a>
          <a href="#listings">Listing standards</a>
          <a href="#fees">Fees and wallet</a>
          <a href="#fulfillment">Customer care</a>
          <a href="#conduct">Marketplace conduct</a>
        </aside>

        <div className="seller-guide-content">
          <section id="start" className="seller-guide-section">
            <div className="seller-guide-section-heading">
              <span>01</span>
              <div>
                <h2>Getting started</h2>
                <p>Set a strong foundation before your first listing goes live.</p>
              </div>
            </div>
            <div className="seller-guide-steps">
              <article><UserPlusIcon aria-hidden="true" /><h3>Create your account</h3><p>Use accurate contact details and confirm your email before you start selling.</p></article>
              <article><DocumentCheckIcon aria-hidden="true" /><h3>Choose your seller workspace</h3><p>Select Products, Courses, Services, Digital, or Bookings to open the tools that match your business.</p></article>
              <article><ShieldCheckIcon aria-hidden="true" /><h3>Keep your profile current</h3><p>Make sure your name, business details, and customer-facing information remain accurate.</p></article>
            </div>
          </section>

          <section id="listings" className="seller-guide-section">
            <div className="seller-guide-section-heading">
              <span>02</span>
              <div>
                <h2>Listing standards</h2>
                <p>Strong listings make it easier for customers to make an informed decision.</p>
              </div>
            </div>
            <div className="seller-guide-checklist">
              <div><CheckIcon aria-hidden="true" /><span>Use clear, accurate titles, descriptions, prices, and specifications.</span></div>
              <div><CheckIcon aria-hidden="true" /><span>Use original, high-quality images or media that honestly represent the offer.</span></div>
              <div><CheckIcon aria-hidden="true" /><span>Set realistic availability, delivery, lesson, service, or appointment expectations.</span></div>
              <div><CheckIcon aria-hidden="true" /><span>Only publish content you are allowed to sell, distribute, or use commercially.</span></div>
            </div>
          </section>

          <section id="fees" className="seller-guide-section seller-guide-fees-section">
            <div className="seller-guide-section-heading">
              <span>03</span>
              <div>
                <h2>Fees and your rifKANDO wallet</h2>
                <p>Commission is calculated by the category of the completed sale and recorded before seller funds enter the wallet.</p>
              </div>
            </div>
            <div className="seller-guide-fee-grid">
              {feeCategories.map((category) => (
                <div key={category.type}>
                  <span>{category.label}</span>
                  <strong>{formatCommissionRate(category.type)}</strong>
                </div>
              ))}
            </div>
            <div className="seller-guide-wallet-note">
              <CurrencyDollarIcon aria-hidden="true" />
              <p>Payments are processed into your rifKANDO wallet. New sellers can request a withdrawal after {WITHDRAWAL_HOLD_DAYS} days. Wallet eligibility and balances are shown in your seller dashboard.</p>
            </div>
          </section>

          <section id="fulfillment" className="seller-guide-section">
            <div className="seller-guide-section-heading">
              <span>04</span>
              <div>
                <h2>Customer care and fulfillment</h2>
                <p>Reliability builds trust, repeat business, and a healthier marketplace.</p>
              </div>
            </div>
            <div className="seller-guide-two-column">
              <div><h3>Do</h3><ul><li>Meet the delivery or service timeframe you communicate.</li><li>Respond to customer questions promptly and professionally.</li><li>Keep customers informed when an order, booking, or request changes.</li></ul></div>
              <div><h3>Avoid</h3><ul><li>Misleading product details, hidden conditions, or unavailable inventory.</li><li>Requesting payments outside rifKANDO for marketplace activity.</li><li>Using customer information for purposes unrelated to the transaction.</li></ul></div>
            </div>
          </section>

          <section id="conduct" className="seller-guide-section">
            <div className="seller-guide-section-heading">
              <span>05</span>
              <div>
                <h2>Marketplace conduct</h2>
                <p>rifKANDO does not allow illegal, counterfeit, harmful, discriminatory, adult, or copyright-infringing content and products.</p>
              </div>
            </div>
            <p className="seller-guide-section-copy">Listings or accounts that breach these standards may be reviewed, removed, restricted, or suspended. Serious or repeated violations can lead to account termination, subject to the Terms of Service and applicable law.</p>
          </section>

          <section className="seller-guide-support">
            <div>
              <h2>Need help setting up?</h2>
              <p>Our support team can help you choose the right seller workspace or understand your seller tools.</p>
            </div>
            <Link to="/contact">Contact support <ArrowRightIcon aria-hidden="true" /></Link>
          </section>
        </div>
      </div>

      <style>{`
        .seller-guide-page { background: #f7fafc; color: var(--color-brand-ink); min-height: calc(100vh - 80px); padding-bottom: 5rem; }
        .seller-guide-hero { background: linear-gradient(125deg, var(--color-brand-ink), #10233e 68%, var(--color-brand-blue) 150%); color: #fff; overflow: hidden; }
        .seller-guide-hero-grid { align-items: center; display: grid; gap: clamp(2rem, 6vw, 6rem); grid-template-columns: minmax(0, 1.3fr) minmax(15rem, .7fr); padding: clamp(4rem, 8vw, 6.5rem) 0; }
        .seller-guide-eyebrow { align-items: center; color: var(--color-primary-light); display: flex; font-size: .76rem; font-weight: 800; gap: .5rem; letter-spacing: .1em; margin: 0 0 1rem; text-transform: uppercase; }
        .seller-guide-eyebrow svg { height: 1.15rem; width: 1.15rem; }
        .seller-guide-hero h1 { font-size: clamp(2.35rem, 5vw, 4.2rem); letter-spacing: -.055em; line-height: 1.04; margin: 0; max-width: 45rem; }
        .seller-guide-intro { color: var(--color-primary-light); font-size: 1.08rem; line-height: 1.75; margin: 1.25rem 0 0; max-width: 40rem; }
        .seller-guide-actions { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: 1.8rem; }
        .seller-guide-primary-action, .seller-guide-secondary-action { align-items: center; border-radius: .72rem; display: inline-flex; font-weight: 800; gap: .5rem; min-height: 2.9rem; padding: .72rem 1rem; text-decoration: none; }
        .seller-guide-primary-action { background: var(--color-brand-blue); color: var(--color-brand-ink); }
        .seller-guide-primary-action svg, .seller-guide-support a svg { height: 1rem; width: 1rem; }
        .seller-guide-secondary-action { border: 1px solid rgba(255,255,255,.32); color: #fff; }
        .seller-guide-hero-card { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); border-radius: 1.1rem; padding: 1.5rem; }
        .seller-guide-hero-card > span { color: var(--color-primary-light); font-size: .75rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
        .seller-guide-hero-card ol { display: grid; gap: 1rem; list-style: none; margin: 1.2rem 0 0; padding: 0; }
        .seller-guide-hero-card li { align-items: center; display: flex; font-weight: 700; gap: .75rem; }
        .seller-guide-hero-card strong { align-items: center; background: var(--color-brand-blue); border-radius: 50%; color: var(--color-brand-ink); display: inline-flex; height: 1.65rem; justify-content: center; width: 1.65rem; }
        .seller-guide-layout { align-items: start; display: grid; gap: clamp(1.5rem, 4vw, 3.5rem); grid-template-columns: minmax(11rem, 14rem) minmax(0, 1fr); margin-top: clamp(2rem, 5vw, 4rem); }
        .seller-guide-nav { display: flex; flex-direction: column; gap: .15rem; position: sticky; top: 6.5rem; }
        .seller-guide-nav p { color: var(--color-brand-ink); font-size: .72rem; font-weight: 800; letter-spacing: .1em; margin: 0 0 .55rem; text-transform: uppercase; }
        .seller-guide-nav a { border-left: 2px solid transparent; color: #5f6d7e; font-size: .88rem; padding: .45rem .75rem; text-decoration: none; }
        .seller-guide-nav a:hover { border-color: var(--color-brand-blue); color: var(--color-brand-ink); }
        .seller-guide-content { display: grid; gap: 1.15rem; }
        .seller-guide-section { background: #fff; border: 1px solid #e3ebf3; border-radius: 1.1rem; box-shadow: 0 10px 28px rgba(10, 27, 53, .05); padding: clamp(1.35rem, 4vw, 2.25rem); scroll-margin-top: 6.5rem; }
        .seller-guide-section-heading { display: grid; gap: 1rem; grid-template-columns: 2.2rem minmax(0, 1fr); margin-bottom: 1.25rem; }
        .seller-guide-section-heading > span { color: var(--color-brand-ink); font-size: .76rem; font-weight: 850; letter-spacing: .1em; padding-top: .35rem; }
        .seller-guide-section h2 { font-size: clamp(1.25rem, 2vw, 1.6rem); letter-spacing: -.025em; margin: 0 0 .45rem; }
        .seller-guide-section-heading p, .seller-guide-section-copy { color: #58677a; line-height: 1.7; margin: 0; }
        .seller-guide-steps { display: grid; gap: .85rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .seller-guide-steps article { background: #f8fbfd; border: 1px solid #e5eef5; border-radius: .9rem; padding: 1rem; }
        .seller-guide-steps svg { color: var(--color-brand-blue); height: 1.4rem; width: 1.4rem; }
        .seller-guide-steps h3 { font-size: .95rem; margin: .8rem 0 .4rem; }
        .seller-guide-steps p { color: #627186; font-size: .84rem; line-height: 1.6; margin: 0; }
        .seller-guide-checklist { display: grid; gap: .75rem; }
        .seller-guide-checklist div { align-items: flex-start; color: #4e5f74; display: flex; gap: .65rem; line-height: 1.6; }
        .seller-guide-checklist svg { color: var(--color-brand-ink); flex: 0 0 auto; height: 1.1rem; margin-top: .2rem; width: 1.1rem; }
        .seller-guide-fees-section { background: linear-gradient(125deg, #f6fbff, #fff); }
        .seller-guide-fee-grid { display: grid; gap: .7rem; grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .seller-guide-fee-grid div { background: #fff; border: 1px solid #dfebf4; border-radius: .75rem; padding: .9rem; }
        .seller-guide-fee-grid span { color: #5c6b7d; display: block; font-size: .76rem; line-height: 1.35; }
        .seller-guide-fee-grid strong { color: var(--color-brand-ink); display: block; font-size: 1.3rem; margin-top: .45rem; }
        .seller-guide-wallet-note { align-items: flex-start; background: var(--color-brand-ink); border-radius: .85rem; color: #fff; display: flex; gap: .75rem; margin-top: 1rem; padding: 1rem; }
        .seller-guide-wallet-note svg { color: var(--color-brand-blue); flex: 0 0 auto; height: 1.35rem; margin-top: .1rem; width: 1.35rem; }
        .seller-guide-wallet-note p { color: var(--color-primary-light); line-height: 1.65; margin: 0; }
        .seller-guide-two-column { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .seller-guide-two-column > div { border: 1px solid #e4edf4; border-radius: .85rem; padding: 1rem; }
        .seller-guide-two-column h3 { font-size: .96rem; margin: 0 0 .65rem; }
        .seller-guide-two-column ul { color: #58677a; display: grid; gap: .55rem; line-height: 1.55; margin: 0; padding-left: 1.1rem; }
        .seller-guide-support { align-items: center; background: var(--color-brand-ink); border-radius: 1.1rem; color: #fff; display: flex; gap: 1rem; justify-content: space-between; padding: clamp(1.35rem, 4vw, 2rem); }
        .seller-guide-support h2 { font-size: 1.25rem; margin: 0 0 .35rem; }
        .seller-guide-support p { color: var(--color-primary-light); line-height: 1.55; margin: 0; }
        .seller-guide-support a { align-items: center; background: #fff; border-radius: .7rem; color: var(--color-brand-ink); display: inline-flex; flex: 0 0 auto; font-weight: 800; gap: .45rem; padding: .75rem .95rem; text-decoration: none; }
        @media (max-width: 900px) { .seller-guide-hero-grid, .seller-guide-layout { grid-template-columns: 1fr; } .seller-guide-nav { background: #fff; border: 1px solid #e3ebf3; border-radius: .9rem; flex-direction: row; flex-wrap: wrap; padding: .85rem; position: static; } .seller-guide-nav p { flex-basis: 100%; } .seller-guide-nav a { background: #f7fafc; border: 1px solid #e3ebf3; border-radius: 99px; font-size: .78rem; padding: .4rem .65rem; } }
        @media (max-width: 680px) { .seller-guide-hero-grid { padding: 3.7rem 0; } .seller-guide-steps, .seller-guide-two-column { grid-template-columns: 1fr; } .seller-guide-fee-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .seller-guide-section-heading { grid-template-columns: 1.75rem minmax(0, 1fr); } .seller-guide-support { align-items: flex-start; flex-direction: column; } .seller-guide-support a { width: 100%; justify-content: center; } }
      `}</style>
    </main>
  )
}

export default SellerGuidelines
