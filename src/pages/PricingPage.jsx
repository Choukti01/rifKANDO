import React from 'react'
import { Link } from 'react-router-dom'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  WalletIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { formatCommissionRate, WITHDRAWAL_HOLD_DAYS } from '../config/commissionPolicy'

const pricingPlans = [
  { type: 'product', title: 'Physical products', icon: ShoppingBagIcon, bestFor: 'Merchants selling tangible goods', features: ['Inventory and product listings', 'Order and fulfillment tools', 'Customer reviews'] },
  { type: 'course', title: 'Courses', icon: AcademicCapIcon, bestFor: 'Educators and trainers', features: ['Course and lesson publishing', 'Student access management', 'Course workspace tools'] },
  { type: 'service', title: 'Services', icon: WrenchScrewdriverIcon, bestFor: 'Freelancers and service providers', features: ['Service listings and packages', 'Client requests', 'Portfolio and review tools'] },
  { type: 'digital', title: 'Digital products', icon: ComputerDesktopIcon, bestFor: 'Creators of digital resources', features: ['Digital product listings', 'Purchase request workflow', 'Creator workspace tools'] },
  { type: 'findit', title: 'FINDit solutions', icon: MagnifyingGlassIcon, bestFor: 'Sellers who can source hard-to-find items', features: ['Private buyer requests', 'Quoted COD solutions', '5% commission after settlement'] },
]

const PricingPage = () => {
  return (
    <main className="fees-page">
      <section className="fees-hero">
        <div className="container fees-hero-content">
          <p className="fees-eyebrow"><CurrencyDollarIcon aria-hidden="true" /> Fees and pricing</p>
          <h1>One clear commission for every way you sell.</h1>
          <p>Choose the seller workspace that fits your business. rifKANDO shows the applicable commission clearly before seller funds enter your wallet.</p>
          <div className="fees-hero-actions">
            <Link to="/choose-seller-type">Become a seller <ArrowRightIcon aria-hidden="true" /></Link>
            <Link to="/seller-guidelines">Read the seller guide</Link>
          </div>
        </div>
      </section>

      <div className="container fees-content">
        <section className="fees-principles" aria-label="Pricing principles">
          <article><span>01</span><h2>Category-based</h2><p>Your rate is determined by the category of the sale.</p></article>
          <article><span>02</span><h2>Visible upfront</h2><p>Seller commission is calculated before wallet settlement.</p></article>
          <article><span>03</span><h2>Wallet based</h2><p>Seller funds are recorded in your rifKANDO wallet.</p></article>
        </section>

        <section className="fees-section" aria-labelledby="rate-title">
          <div className="fees-section-heading">
            <div><p>Commission rates</p><h2 id="rate-title">Pick the workspace that matches what you offer.</h2></div>
            <span>All prices in MAD</span>
          </div>
          <div className="fees-grid">
            {pricingPlans.map((plan) => {
              const Icon = plan.icon
              return (
                <article className="fees-card" key={plan.type}>
                  <div className="fees-card-top"><span className="fees-icon"><Icon aria-hidden="true" /></span><span className="fees-rate">{formatCommissionRate(plan.type)}</span></div>
                  <h3>{plan.title}</h3>
                  <p className="fees-best-for">Best for {plan.bestFor.toLowerCase()}</p>
                  <ul>{plan.features.map((feature) => <li key={feature}><CheckIcon aria-hidden="true" />{feature}</li>)}</ul>
                  <Link to="/choose-seller-type">Choose this workspace <ArrowRightIcon aria-hidden="true" /></Link>
                </article>
              )
            })}
          </div>
        </section>

        <section className="fees-wallet-section" aria-labelledby="wallet-title">
          <div className="fees-wallet-icon"><WalletIcon aria-hidden="true" /></div>
          <div><p>Seller wallet</p><h2 id="wallet-title">Know where your earnings are.</h2><p>When a completed marketplace sale is settled, the seller amount after commission is recorded in the rifKANDO wallet. New sellers can request a withdrawal after {WITHDRAWAL_HOLD_DAYS} days.</p></div>
          <Link to="/seller-guidelines">How payouts work <ArrowRightIcon aria-hidden="true" /></Link>
        </section>

        <section className="fees-section fees-faq" aria-labelledby="fees-faq-title">
          <div className="fees-section-heading"><div><p>Questions answered</p><h2 id="fees-faq-title">The important details.</h2></div></div>
          <div className="fees-faq-grid">
            <article><h3>How is my rate chosen?</h3><p>The commission matches the seller workspace and marketplace category for the completed sale.</p></article>
            <article><h3>When can I withdraw?</h3><p>New sellers can request withdrawals after {WITHDRAWAL_HOLD_DAYS} days. Your wallet shows the exact availability date.</p></article>
            <article><h3>What does the commission cover?</h3><p>It is rifKANDO's marketplace commission for the sale. Applicable delivery or payment details are shown during the relevant checkout flow.</p></article>
            <article><h3>What happens with an approved refund?</h3><p>When a refund is approved, the related financial records are adjusted according to the transaction workflow.</p></article>
          </div>
        </section>

        <section className="fees-support">
          <div><h2>Still deciding how to sell?</h2><p>Start with the seller guide, then choose the workspace that best fits your business.</p></div>
          <Link to="/contact">Contact support <ArrowRightIcon aria-hidden="true" /></Link>
        </section>
      </div>

      <style>{`
        .fees-page { background: #f7fafc; color: var(--color-brand-ink); min-height: calc(100vh - 80px); padding-bottom: 5rem; }
        .fees-hero { background: linear-gradient(125deg, var(--color-brand-ink), #10233e 68%, var(--color-brand-blue) 150%); color: #fff; overflow: hidden; position: relative; }
        .fees-hero::after { background: radial-gradient(circle, rgba(255,255,255,.16), transparent 67%); content: ''; height: 34rem; position: absolute; right: -13rem; top: -20rem; width: 34rem; }
        .fees-hero-content { max-width: 52rem; padding: clamp(4rem, 8vw, 6.5rem) 0; position: relative; z-index: 1; }
        .fees-eyebrow { align-items: center; color: var(--color-primary-light); display: flex; font-size: .76rem; font-weight: 800; gap: .5rem; letter-spacing: .1em; margin: 0 0 1rem; text-transform: uppercase; }
        .fees-eyebrow svg { height: 1.15rem; width: 1.15rem; }
        .fees-hero h1 { font-size: clamp(2.35rem, 5vw, 4.2rem); letter-spacing: -.055em; line-height: 1.04; margin: 0; }
        .fees-hero > .container > p:not(.fees-eyebrow) { color: var(--color-primary-light); font-size: 1.08rem; line-height: 1.75; margin: 1.25rem 0 0; max-width: 42rem; }
        .fees-hero-actions { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: 1.8rem; }
        .fees-hero-actions a, .fees-card > a, .fees-wallet-section > a, .fees-support a { align-items: center; display: inline-flex; font-weight: 800; gap: .45rem; text-decoration: none; }
        .fees-hero-actions a:first-child { background: var(--color-brand-blue); border-radius: .72rem; color: var(--color-brand-ink); padding: .75rem 1rem; }
        .fees-hero-actions a:last-child { border: 1px solid rgba(255,255,255,.3); border-radius: .72rem; color: #fff; padding: .75rem 1rem; }
        .fees-hero-actions svg, .fees-card > a svg, .fees-wallet-section > a svg, .fees-support svg { height: 1rem; width: 1rem; }
        .fees-content { padding-top: clamp(2rem, 5vw, 4rem); }
        .fees-principles { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 1.25rem; }
        .fees-principles article { background: #fff; border: 1px solid #e2ebf3; border-radius: 1rem; padding: 1.15rem; }
        .fees-principles span { color: var(--color-brand-blue); font-size: .74rem; font-weight: 900; letter-spacing: .1em; }
        .fees-principles h2 { font-size: 1rem; margin: .65rem 0 .35rem; }
        .fees-principles p { color: #607084; font-size: .86rem; line-height: 1.55; margin: 0; }
        .fees-section { margin-top: clamp(2.5rem, 6vw, 4.5rem); }
        .fees-section-heading { align-items: end; display: flex; gap: 1rem; justify-content: space-between; margin-bottom: 1.4rem; }
        .fees-section-heading p, .fees-wallet-section > div:nth-child(2) > p:first-child { color: var(--color-brand-ink); font-size: .74rem; font-weight: 850; letter-spacing: .1em; margin: 0 0 .55rem; text-transform: uppercase; }
        .fees-section-heading h2, .fees-wallet-section h2 { font-size: clamp(1.45rem, 3vw, 2.2rem); letter-spacing: -.04em; line-height: 1.14; margin: 0; }
        .fees-section-heading > span { color: #66768a; font-size: .82rem; }
        .fees-grid { display: grid; gap: 1rem; grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .fees-card { background: #fff; border: 1px solid #e2ebf3; border-radius: 1rem; box-shadow: 0 10px 26px rgba(10, 27, 53, .05); display: flex; flex-direction: column; padding: 1.15rem; transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease; }
        .fees-card:hover { border-color: var(--color-brand-blue); box-shadow: 0 14px 30px rgba(10, 27, 53, .11); transform: translateY(-3px); }
        .fees-card-top { align-items: center; display: flex; justify-content: space-between; }
        .fees-icon { align-items: center; background: var(--color-brand-soft); border-radius: .75rem; color: var(--color-brand-ink); display: inline-flex; height: 2.65rem; justify-content: center; width: 2.65rem; }
        .fees-icon svg { height: 1.35rem; width: 1.35rem; }
        .fees-rate { color: var(--color-brand-ink); font-size: 1.65rem; font-weight: 900; letter-spacing: -.04em; }
        .fees-card h3 { font-size: 1.05rem; margin: 1rem 0 .3rem; }
        .fees-best-for { color: #647488; font-size: .8rem; line-height: 1.45; margin: 0; min-height: 2.35rem; }
        .fees-card ul { display: grid; gap: .55rem; list-style: none; margin: 1.1rem 0; padding: 0; }
        .fees-card li { align-items: flex-start; color: #5b6b7e; display: flex; font-size: .81rem; gap: .42rem; line-height: 1.45; }
        .fees-card li svg { color: var(--color-brand-blue); flex: 0 0 auto; height: .95rem; margin-top: .1rem; width: .95rem; }
        .fees-card > a { color: var(--color-brand-ink); font-size: .82rem; margin-top: auto; }
        .fees-wallet-section { align-items: center; background: var(--color-brand-ink); border-radius: 1.1rem; color: #fff; display: grid; gap: 1.25rem; grid-template-columns: auto minmax(0, 1fr) auto; margin-top: 1.25rem; padding: clamp(1.3rem, 4vw, 2.15rem); }
        .fees-wallet-icon { align-items: center; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); border-radius: .9rem; color: var(--color-brand-blue); display: inline-flex; height: 3rem; justify-content: center; width: 3rem; }
        .fees-wallet-icon svg { height: 1.55rem; width: 1.55rem; }
        .fees-wallet-section > div:nth-child(2) > p:first-child { color: var(--color-primary-light); }
        .fees-wallet-section h2 { font-size: clamp(1.35rem, 3vw, 1.9rem); }
        .fees-wallet-section > div:nth-child(2) > p:last-child { color: var(--color-primary-light); line-height: 1.65; margin: .65rem 0 0; }
        .fees-wallet-section > a, .fees-support a { background: #fff; border-radius: .7rem; color: var(--color-brand-ink); flex: 0 0 auto; padding: .75rem .95rem; }
        .fees-faq-grid { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .fees-faq-grid article { background: #fff; border: 1px solid #e2ebf3; border-radius: .9rem; padding: 1.15rem; }
        .fees-faq-grid h3 { font-size: 1rem; margin: 0 0 .5rem; }
        .fees-faq-grid p { color: #607084; line-height: 1.6; margin: 0; }
        .fees-support { align-items: center; background: linear-gradient(115deg, var(--color-brand-soft), #fff); border: 1px solid #dcebf5; border-radius: 1.1rem; display: flex; gap: 1rem; justify-content: space-between; margin-top: clamp(2.5rem, 6vw, 4rem); padding: clamp(1.3rem, 4vw, 2rem); }
        .fees-support h2 { font-size: 1.3rem; margin: 0 0 .35rem; }
        .fees-support p { color: #5e6d80; line-height: 1.55; margin: 0; }
        .fees-support a { background: var(--color-brand-ink); color: #fff; }
        @media (max-width: 1050px) { .fees-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 720px) { .fees-principles, .fees-grid, .fees-faq-grid { grid-template-columns: 1fr; } .fees-section-heading { align-items: flex-start; flex-direction: column; } .fees-wallet-section { align-items: flex-start; grid-template-columns: auto minmax(0, 1fr); } .fees-wallet-section > a { grid-column: 1 / -1; justify-content: center; width: 100%; } .fees-support { align-items: flex-start; flex-direction: column; } .fees-support a { justify-content: center; width: 100%; } }
      `}</style>
    </main>
  )
}

export default PricingPage
