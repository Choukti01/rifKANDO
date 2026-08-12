import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon, DocumentTextIcon, ScaleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

const termsSections = [
  { id: 'acceptance', title: 'Acceptance of terms', text: 'By accessing or using rifKANDO, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.' },
  { id: 'service', title: 'Description of service', text: 'rifKANDO is a multi-service platform that connects buyers and sellers. We provide a marketplace for physical products, digital products, courses, services, and bookings.' },
  { id: 'accounts', title: 'User accounts', text: 'You must create an account to use certain features. You are responsible for maintaining the security of your account and for all activities that occur under your account.' },
  { id: 'buying-selling', title: 'Buying and selling', text: 'When you purchase an item on rifKANDO, you agree to pay the listed price plus any applicable fees. Sellers agree to deliver the item as described and within the stated timeframe.' },
  { id: 'payments', title: 'Payments and fees', text: 'All payments are processed through our secure payment system. rifKANDO charges a commission on each sale, as outlined in our pricing page.' },
  { id: 'refunds', title: 'Refund policy', text: 'Buyers may request refunds within 7 days of delivery for physical products, and within 14 days for digital products and services. Refunds are subject to review.' },
  { id: 'prohibited', title: 'Prohibited activities', text: 'You may not use our platform for illegal activities, to sell prohibited items, or to harass other users. Violations may result in account suspension or termination.' },
  { id: 'property', title: 'Intellectual property', text: 'rifKANDO and its content are protected by copyright, trademark, and other laws. You may not copy, modify, or distribute our content without permission.' },
  { id: 'liability', title: 'Limitation of liability', text: 'rifKANDO is not liable for any damages arising from your use of our platform. We provide the platform "as is" without warranties of any kind.' },
  { id: 'changes', title: 'Changes to these terms', text: 'We may modify these terms at any time. Continued use of the platform constitutes acceptance of the modified terms.' },
]

const TermsPage = () => {
  return (
    <main className="terms-page">
      <section className="terms-hero">
        <div className="container terms-hero-content">
          <p className="terms-eyebrow"><ScaleIcon aria-hidden="true" /> Legal information</p>
          <h1>The standards for using rifKANDO.</h1>
          <p>These Terms of Service explain the agreement between you and rifKANDO when you access the platform, buy, sell, or use its marketplace tools.</p>
          <div className="terms-meta"><span>Last updated: March 2026</span><span aria-hidden="true">•</span><a href="#contact">Legal contact</a></div>
        </div>
      </section>

      <div className="container terms-layout">
        <aside className="terms-navigation" aria-label="Terms navigation">
          <p>On this page</p>
          {termsSections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
          <a href="#contact">Contact information</a>
        </aside>

        <div className="terms-content">
          <section className="terms-intro-card">
            <ShieldCheckIcon aria-hidden="true" />
            <div><h2>Read these terms before you use the marketplace.</h2><p>They cover account responsibilities, marketplace activity, payments, refunds, and the standards that help keep rifKANDO useful and safe for everyone.</p></div>
            <Link to="/pricing">Fees and pricing <ArrowRightIcon aria-hidden="true" /></Link>
          </section>

          <div className="terms-policy-card">
            {termsSections.map((section, index) => (
              <section id={section.id} className="terms-section" key={section.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h2>{section.title}</h2><p>{section.text}</p></div>
              </section>
            ))}
            <section id="contact" className="terms-contact">
              <DocumentTextIcon aria-hidden="true" />
              <div><h2>Questions about these terms?</h2><p>Contact us at <a href="mailto:legalrifKANDO@gmail.com">legalrifKANDO@gmail.com</a> or reach our support team with the context of your question.</p></div>
              <Link to="/contact">Contact us <ArrowRightIcon aria-hidden="true" /></Link>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .terms-page { background: #f7fafc; color: var(--color-brand-ink); min-height: calc(100vh - 80px); padding-bottom: 5rem; }
        .terms-hero { background: linear-gradient(125deg, var(--color-brand-ink), #10233e 68%, var(--color-brand-blue) 150%); color: #fff; overflow: hidden; position: relative; }
        .terms-hero::after { background: radial-gradient(circle, rgba(255,255,255,.16), transparent 67%); content: ''; height: 32rem; position: absolute; right: -12rem; top: -17rem; width: 32rem; }
        .terms-hero-content { max-width: 49rem; padding: clamp(4rem, 8vw, 6.5rem) 0; position: relative; z-index: 1; }
        .terms-eyebrow { align-items: center; color: var(--color-primary-light); display: flex; font-size: .76rem; font-weight: 800; gap: .5rem; letter-spacing: .1em; margin: 0 0 1rem; text-transform: uppercase; }
        .terms-eyebrow svg { height: 1.15rem; width: 1.15rem; }
        .terms-hero h1 { font-size: clamp(2.35rem, 5vw, 4.2rem); letter-spacing: -.055em; line-height: 1.04; margin: 0; }
        .terms-hero > .container > p:not(.terms-eyebrow) { color: var(--color-primary-light); font-size: 1.08rem; line-height: 1.75; margin: 1.25rem 0 0; }
        .terms-meta { align-items: center; color: var(--color-primary-light); display: flex; flex-wrap: wrap; font-size: .9rem; gap: .65rem; margin-top: 1.5rem; }
        .terms-meta a { color: #fff; font-weight: 800; text-decoration: underline; text-underline-offset: .2rem; }
        .terms-layout { align-items: start; display: grid; gap: clamp(1.5rem, 4vw, 3.5rem); grid-template-columns: minmax(11rem, 14rem) minmax(0, 1fr); margin-top: clamp(2rem, 5vw, 4rem); }
        .terms-navigation { border-left: 1px solid #d9e4ed; display: flex; flex-direction: column; gap: .15rem; padding: .05rem 0; position: sticky; top: 6.5rem; }
        .terms-navigation p { color: var(--color-brand-ink); font-size: .72rem; font-weight: 850; letter-spacing: .1em; margin: 0 0 .6rem; padding-left: .75rem; text-transform: uppercase; }
        .terms-navigation a { border-left: 2px solid transparent; color: #5d6d80; font-size: .85rem; line-height: 1.35; margin-left: -1px; padding: .4rem .75rem; text-decoration: none; }
        .terms-navigation a:hover, .terms-navigation a:focus-visible { border-color: var(--color-brand-blue); color: var(--color-brand-ink); outline: 0; }
        .terms-content { min-width: 0; }
        .terms-intro-card { align-items: center; background: #fff; border: 1px solid #e2ebf3; border-radius: 1rem; display: grid; gap: 1rem; grid-template-columns: auto minmax(0, 1fr) auto; margin-bottom: 1.25rem; padding: 1.2rem; }
        .terms-intro-card > svg { background: var(--color-brand-soft); border-radius: .7rem; color: var(--color-brand-ink); height: 2.6rem; padding: .6rem; width: 2.6rem; }
        .terms-intro-card h2 { font-size: 1rem; margin: 0 0 .3rem; }
        .terms-intro-card p { color: #607084; line-height: 1.55; margin: 0; }
        .terms-intro-card a, .terms-contact > a { align-items: center; background: var(--color-brand-ink); border-radius: .65rem; color: #fff; display: inline-flex; font-size: .84rem; font-weight: 800; gap: .4rem; padding: .7rem .85rem; text-decoration: none; white-space: nowrap; }
        .terms-intro-card a svg, .terms-contact > a svg { height: .95rem; width: .95rem; }
        .terms-policy-card { background: #fff; border: 1px solid #e2ebf3; border-radius: 1.2rem; box-shadow: 0 14px 36px rgba(10,27,53,.06); overflow: hidden; }
        .terms-section { display: grid; gap: 1rem; grid-template-columns: 2.25rem minmax(0, 1fr); padding: clamp(1.35rem, 4vw, 2.25rem); scroll-margin-top: 6.5rem; }
        .terms-section + .terms-section { border-top: 1px solid #e8eef4; }
        .terms-section > span { color: var(--color-brand-ink); font-size: .76rem; font-weight: 900; letter-spacing: .1em; padding-top: .3rem; }
        .terms-section h2 { font-size: clamp(1.2rem, 2vw, 1.55rem); letter-spacing: -.025em; line-height: 1.2; margin: 0 0 .65rem; text-transform: capitalize; }
        .terms-section p { color: #56667a; line-height: 1.75; margin: 0; }
        .terms-contact { align-items: center; background: var(--color-brand-ink); color: #fff; display: grid; gap: 1rem; grid-template-columns: auto minmax(0, 1fr) auto; padding: clamp(1.35rem, 4vw, 2rem); scroll-margin-top: 6.5rem; }
        .terms-contact > svg { color: var(--color-brand-blue); height: 2rem; width: 2rem; }
        .terms-contact h2 { font-size: 1.2rem; margin: 0 0 .35rem; }
        .terms-contact p { color: var(--color-primary-light); line-height: 1.55; margin: 0; }
        .terms-contact p a { color: #fff; font-weight: 800; }
        .terms-contact > a { background: #fff; color: var(--color-brand-ink); }
        @media (max-width: 900px) { .terms-layout { grid-template-columns: 1fr; } .terms-navigation { background: #fff; border: 1px solid #e2ebf3; border-radius: .9rem; flex-direction: row; flex-wrap: wrap; padding: .85rem; position: static; } .terms-navigation p { flex-basis: 100%; padding: 0; } .terms-navigation a { background: #f7fafc; border: 1px solid #e2ebf3; border-radius: 99px; font-size: .78rem; margin: 0; padding: .4rem .65rem; } }
        @media (max-width: 680px) { .terms-hero-content { padding: 3.7rem 0; } .terms-intro-card, .terms-contact { align-items: flex-start; grid-template-columns: auto minmax(0, 1fr); } .terms-intro-card > a, .terms-contact > a { grid-column: 1 / -1; justify-content: center; width: 100%; } .terms-section { grid-template-columns: 1.7rem minmax(0, 1fr); padding: 1.35rem; } }
      `}</style>
    </main>
  )
}

export default TermsPage
