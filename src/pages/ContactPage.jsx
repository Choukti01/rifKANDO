import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  ClockIcon,
  EnvelopeIcon,
  LifebuoyIcon,
  MapPinIcon,
  PhoneIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const SUPPORT_EMAIL = 'rifKANDO@gmail.com'

const ContactPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const subject = encodeURIComponent(`[rifKANDO support] ${formData.subject}`)
    const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`)
    window.location.assign(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`)
  }

  return (
    <main className="contact-page-redesign">
      <section className="contact-hero">
        <div className="container contact-hero-grid">
          <div>
            <p className="contact-eyebrow"><LifebuoyIcon aria-hidden="true" /> Contact support</p>
            <h1>Tell us how we can help.</h1>
            <p>Whether you have a marketplace question, need seller guidance, or want to report an issue, our team is here to help.</p>
          </div>
          <div className="contact-hero-note"><UserGroupIcon aria-hidden="true" /><div><strong>Start with the details</strong><span>Share your account email, relevant order or listing information, and what you need help with.</span></div></div>
        </div>
      </section>

      <div className="container contact-content">
        <section className="contact-shortcuts" aria-label="Support shortcuts">
          <Link to="/help"><LifebuoyIcon aria-hidden="true" /><span><strong>Visit Help Center</strong><small>Browse common questions and answers</small></span><ArrowRightIcon aria-hidden="true" /></Link>
          <Link to="/seller-guidelines"><UserGroupIcon aria-hidden="true" /><span><strong>Read the Seller Guide</strong><small>Review seller standards and fees</small></span><ArrowRightIcon aria-hidden="true" /></Link>
        </section>

        <div className="contact-grid-redesign">
          <section className="contact-details-card" aria-labelledby="contact-details-title">
            <p className="contact-card-kicker">Support details</p>
            <h2 id="contact-details-title">Choose the best way to reach us.</h2>
            <div className="contact-detail-list">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-detail"><span><EnvelopeIcon aria-hidden="true" /></span><div><strong>General support</strong><small>{SUPPORT_EMAIL}</small></div></a>
              <a href="mailto:sellersRifKANDO@gmail.com" className="contact-detail"><span><UserGroupIcon aria-hidden="true" /></span><div><strong>Seller support</strong><small>sellersRifKANDO@gmail.com</small></div></a>
              <a href="tel:+212624483286" className="contact-detail"><span><PhoneIcon aria-hidden="true" /></span><div><strong>Phone</strong><small>+212 624 483 286</small></div></a>
              <div className="contact-detail static"><span><ClockIcon aria-hidden="true" /></span><div><strong>Support hours</strong><small>Monday to Friday, 9:00 to 18:00<br />Saturday, 10:00 to 14:00</small></div></div>
              <div className="contact-detail static"><span><MapPinIcon aria-hidden="true" /></span><div><strong>Based in Nador</strong><small>Nador, Morocco</small></div></div>
            </div>
          </section>

          <section className="contact-form-card" aria-labelledby="contact-form-title">
            <p className="contact-card-kicker">Send an email</p>
            <h2 id="contact-form-title">Write your message.</h2>
            <p className="contact-form-intro">Submitting this form opens your email application with a message addressed to rifKANDO support. You remain in control of sending it.</p>
            <form onSubmit={handleSubmit}>
              <div className="contact-form-row">
                <div><label htmlFor="contact-name">Your name</label><input id="contact-name" type="text" autoComplete="name" value={formData.name} onChange={updateField('name')} required /></div>
                <div><label htmlFor="contact-email">Email address</label><input id="contact-email" type="email" autoComplete="email" value={formData.email} onChange={updateField('email')} required /></div>
              </div>
              <div><label htmlFor="contact-subject">What can we help with?</label><input id="contact-subject" type="text" value={formData.subject} onChange={updateField('subject')} placeholder="For example, a question about an order" required /></div>
              <div><label htmlFor="contact-message">Message</label><textarea id="contact-message" rows="6" value={formData.message} onChange={updateField('message')} placeholder="Include any useful details so we can help faster." required /></div>
              <button type="submit">Open email message <ArrowRightIcon aria-hidden="true" /></button>
            </form>
          </section>
        </div>
      </div>

      <style>{`
        .contact-page-redesign { background: #f7fafc; color: var(--color-brand-ink); min-height: calc(100vh - 80px); padding-bottom: 5rem; }
        .contact-hero { background: linear-gradient(125deg, var(--color-brand-ink), #10233e 68%, var(--color-brand-blue) 150%); color: #fff; }
        .contact-hero-grid { align-items: center; display: grid; gap: clamp(2rem, 7vw, 7rem); grid-template-columns: minmax(0, 1.25fr) minmax(14rem, .65fr); padding: clamp(4rem, 8vw, 6.5rem) 0; }
        .contact-eyebrow { align-items: center; color: var(--color-primary-light); display: flex; font-size: .76rem; font-weight: 800; gap: .5rem; letter-spacing: .1em; margin: 0 0 1rem; text-transform: uppercase; }
        .contact-eyebrow svg { height: 1.15rem; width: 1.15rem; }
        .contact-hero h1 { font-size: clamp(2.35rem, 5vw, 4.2rem); letter-spacing: -.055em; line-height: 1.04; margin: 0; }
        .contact-hero > .container > div > p:not(.contact-eyebrow) { color: var(--color-primary-light); font-size: 1.08rem; line-height: 1.75; margin: 1.25rem 0 0; max-width: 42rem; }
        .contact-hero-note { align-items: flex-start; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); border-radius: 1.1rem; display: flex; gap: .8rem; padding: 1.25rem; }
        .contact-hero-note > svg { color: var(--color-brand-blue); flex: 0 0 auto; height: 1.55rem; width: 1.55rem; }
        .contact-hero-note strong { display: block; margin-bottom: .35rem; }
        .contact-hero-note span { color: var(--color-primary-light); display: block; font-size: .87rem; line-height: 1.55; }
        .contact-content { padding-top: clamp(2rem, 5vw, 4rem); }
        .contact-shortcuts { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 1.25rem; }
        .contact-shortcuts a { align-items: center; background: #fff; border: 1px solid #e2ebf3; border-radius: .95rem; color: var(--color-brand-ink); display: grid; gap: .7rem; grid-template-columns: auto 1fr auto; padding: 1rem; text-decoration: none; transition: border-color .18s ease, transform .18s ease; }
        .contact-shortcuts a:hover { border-color: var(--color-brand-blue); transform: translateY(-2px); }
        .contact-shortcuts > a > svg:first-child { background: var(--color-brand-soft); border-radius: .65rem; height: 2.3rem; padding: .55rem; width: 2.3rem; }
        .contact-shortcuts strong, .contact-shortcuts small { display: block; }
        .contact-shortcuts strong { font-size: .9rem; }
        .contact-shortcuts small { color: #637387; font-size: .78rem; margin-top: .18rem; }
        .contact-shortcuts > a > svg:last-child { height: 1rem; width: 1rem; }
        .contact-grid-redesign { display: grid; gap: 1.25rem; grid-template-columns: minmax(17rem, .78fr) minmax(0, 1.22fr); }
        .contact-details-card, .contact-form-card { background: #fff; border: 1px solid #e2ebf3; border-radius: 1.1rem; box-shadow: 0 12px 28px rgba(10,27,53,.05); padding: clamp(1.35rem, 4vw, 2.1rem); }
        .contact-card-kicker { color: var(--color-brand-ink); font-size: .74rem; font-weight: 850; letter-spacing: .1em; margin: 0 0 .55rem; text-transform: uppercase; }
        .contact-details-card h2, .contact-form-card h2 { font-size: clamp(1.3rem, 3vw, 1.9rem); letter-spacing: -.035em; line-height: 1.15; margin: 0; }
        .contact-detail-list { display: grid; gap: .75rem; margin-top: 1.4rem; }
        .contact-detail { align-items: center; border: 1px solid #e5edf4; border-radius: .8rem; color: var(--color-brand-ink); display: flex; gap: .7rem; min-height: 4.15rem; padding: .75rem; text-decoration: none; }
        .contact-detail:not(.static):hover { border-color: var(--color-brand-blue); }
        .contact-detail > span { align-items: center; background: var(--color-brand-soft); border-radius: .6rem; display: inline-flex; flex: 0 0 auto; height: 2.25rem; justify-content: center; width: 2.25rem; }
        .contact-detail svg { height: 1.1rem; width: 1.1rem; }
        .contact-detail strong, .contact-detail small { display: block; }
        .contact-detail strong { font-size: .86rem; }
        .contact-detail small { color: #627287; font-size: .78rem; line-height: 1.45; margin-top: .15rem; overflow-wrap: anywhere; }
        .contact-form-intro { color: #627287; line-height: 1.65; margin: .7rem 0 1.3rem; }
        .contact-form-card form { display: grid; gap: 1rem; }
        .contact-form-row { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .contact-form-card form > div { display: grid; gap: .4rem; }
        .contact-form-card label { color: #31445d; font-size: .82rem; font-weight: 750; }
        .contact-form-card input, .contact-form-card textarea { background: #fbfdff; border: 1px solid #dce7f0; border-radius: .7rem; color: var(--color-brand-ink); font: inherit; outline: none; padding: .75rem .8rem; resize: vertical; width: 100%; }
        .contact-form-card input:focus, .contact-form-card textarea:focus { border-color: var(--color-brand-blue); box-shadow: 0 0 0 3px rgba(99,184,243,.22); }
        .contact-form-card button { align-items: center; background: var(--color-brand-ink); border: 0; border-radius: .7rem; color: #fff; cursor: pointer; display: inline-flex; font: inherit; font-weight: 800; gap: .45rem; justify-content: center; margin-top: .2rem; min-height: 3rem; padding: .72rem 1rem; }
        .contact-form-card button svg { height: 1rem; width: 1rem; }
        @media (max-width: 900px) { .contact-hero-grid, .contact-grid-redesign { grid-template-columns: 1fr; } }
        @media (max-width: 620px) { .contact-hero-grid { padding: 3.7rem 0; } .contact-shortcuts, .contact-form-row { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  )
}

export default ContactPage
