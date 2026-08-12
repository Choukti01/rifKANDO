import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CurrencyDollarIcon,
  LifebuoyIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

const categories = [
  { id: 'account', title: 'Account basics', description: 'Registration, profile, and access', icon: UserCircleIcon },
  { id: 'buying', title: 'Buying on rifKANDO', description: 'Orders, checkout, and delivery', icon: ShoppingBagIcon },
  { id: 'selling', title: 'Selling on rifKANDO', description: 'Seller setup and listings', icon: AcademicCapIcon },
  { id: 'wallet', title: 'Wallet and payouts', description: 'Earnings, fees, and withdrawals', icon: CurrencyDollarIcon },
  { id: 'security', title: 'Safety and privacy', description: 'Account protection and data', icon: ShieldCheckIcon },
]

const faqs = [
  { id: 'create-account', category: 'account', question: 'How do I create an account?', answer: 'Use the Register option in the navigation, provide your details, and complete the account verification steps shown to you.' },
  { id: 'profile', category: 'account', question: 'How do I update my profile?', answer: 'Open your profile after signing in to update the information that is available for your account.' },
  { id: 'order', category: 'buying', question: 'How do I place an order?', answer: 'Add an available physical product to your cart, review the checkout details, choose an available payment method, and confirm your order.' },
  { id: 'refund', category: 'buying', question: 'How do refunds work?', answer: 'Refund requests are reviewed against the relevant transaction and marketplace policy. The status of an approved refund is reflected in the order and financial records.' },
  { id: 'seller', category: 'selling', question: 'How do I become a seller?', answer: 'Choose Become a Seller, select the workspace that matches your business, and complete the requested profile and verification steps.' },
  { id: 'listing', category: 'selling', question: 'What makes a strong listing?', answer: 'Use honest titles, accurate descriptions, clear media, correct prices, and realistic availability. Read the Seller Guide before publishing.' },
  { id: 'fees', category: 'wallet', question: 'How are seller fees calculated?', answer: 'rifKANDO applies the commission rate for the relevant seller category. The rate is recorded before seller funds enter the wallet.' },
  { id: 'withdrawal', category: 'wallet', question: 'When can I request a withdrawal?', answer: 'New sellers can request a withdrawal after 14 days. Your seller wallet shows the exact eligibility date and available balance.' },
  { id: 'security', category: 'security', question: 'How do you protect my account?', answer: 'rifKANDO uses authenticated access controls and secure sessions. Keep your password private and contact support if you notice unexpected account activity.' },
  { id: 'privacy', category: 'security', question: 'Where can I read the privacy policy?', answer: 'The Privacy Policy explains the information we collect, how it is used, and the choices available to you.' },
]

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [openFaq, setOpenFaq] = useState(null)

  const visibleFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory
      const matchesSearch = !query || `${faq.question} ${faq.answer}`.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  const selectCategory = (categoryId) => {
    setActiveCategory(categoryId)
    setSearchQuery('')
    setOpenFaq(null)
  }

  return (
    <main className="help-page">
      <section className="help-hero">
        <div className="container help-hero-content">
          <p className="help-eyebrow"><LifebuoyIcon aria-hidden="true" /> rifKANDO help center</p>
          <h1>Answers for every step of your rifKANDO journey.</h1>
          <p>Search the essentials, browse a topic, or reach our support team when you need a hand.</p>
          <label className="help-search" htmlFor="help-search-input">
            <MagnifyingGlassIcon aria-hidden="true" />
            <input id="help-search-input" type="search" placeholder="Search account, order, seller, or wallet help" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setActiveCategory('all'); setOpenFaq(null) }} />
          </label>
        </div>
      </section>

      <div className="container help-content">
        <section aria-labelledby="help-topic-title">
          <div className="help-section-heading"><div><p>Choose a topic</p><h2 id="help-topic-title">Find the right kind of help.</h2></div><button type="button" className={activeCategory === 'all' ? 'help-all-topics active' : 'help-all-topics'} onClick={() => selectCategory('all')}>All topics</button></div>
          <div className="help-category-grid">
            {categories.map((category) => {
              const Icon = category.icon
              const isActive = activeCategory === category.id
              return <button key={category.id} type="button" className={`help-category-card ${isActive ? 'active' : ''}`} aria-pressed={isActive} onClick={() => selectCategory(category.id)}><span><Icon aria-hidden="true" /></span><strong>{category.title}</strong><small>{category.description}</small><ArrowRightIcon aria-hidden="true" /></button>
            })}
          </div>
        </section>

        <section className="help-faq-section" aria-labelledby="help-faq-title">
          <div className="help-section-heading"><div><p>Common questions</p><h2 id="help-faq-title">Helpful answers, without the searching.</h2></div><span className="help-result-count">{visibleFaqs.length} {visibleFaqs.length === 1 ? 'answer' : 'answers'}</span></div>
          <div className="help-faq-list">
            {visibleFaqs.length === 0 ? (
              <div className="help-empty-state"><MagnifyingGlassIcon aria-hidden="true" /><h3>No matching answer yet</h3><p>Try another term or contact support with the details of your question.</p><Link to="/contact">Contact support</Link></div>
            ) : visibleFaqs.map((faq) => {
              const isOpen = openFaq === faq.id
              return <article className={`help-faq-item ${isOpen ? 'open' : ''}`} key={faq.id}>
                <button type="button" aria-expanded={isOpen} aria-controls={`answer-${faq.id}`} onClick={() => setOpenFaq(isOpen ? null : faq.id)}><span>{faq.question}</span>{isOpen ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}</button>
                {isOpen && <div id={`answer-${faq.id}`}><p>{faq.answer}</p></div>}
              </article>
            })}
          </div>
        </section>

        <section className="help-support-card">
          <div><LifebuoyIcon aria-hidden="true" /><h2>Need personal support?</h2><p>Send our team the details, and we will help point you in the right direction.</p></div>
          <div className="help-support-actions"><Link to="/contact">Contact support <ArrowRightIcon aria-hidden="true" /></Link><Link to="/seller-guidelines">Seller guide</Link></div>
        </section>
      </div>

      <style>{`
        .help-page { background: #f7fafc; color: var(--color-brand-ink); min-height: calc(100vh - 80px); padding-bottom: 5rem; }
        .help-hero { background: linear-gradient(125deg, var(--color-brand-ink), #10233e 68%, var(--color-brand-blue) 150%); color: #fff; }
        .help-hero-content { max-width: 53rem; padding: clamp(4rem, 8vw, 6.5rem) 0; }
        .help-eyebrow { align-items: center; color: var(--color-primary-light); display: flex; font-size: .76rem; font-weight: 800; gap: .5rem; letter-spacing: .1em; margin: 0 0 1rem; text-transform: uppercase; }
        .help-eyebrow svg { height: 1.15rem; width: 1.15rem; }
        .help-hero h1 { font-size: clamp(2.3rem, 5vw, 4.15rem); letter-spacing: -.055em; line-height: 1.04; margin: 0; }
        .help-hero > .container > p:not(.help-eyebrow) { color: var(--color-primary-light); font-size: 1.08rem; line-height: 1.7; margin: 1.25rem 0 0; }
        .help-search { align-items: center; background: #fff; border: 1px solid rgba(255,255,255,.5); border-radius: .85rem; box-shadow: 0 12px 30px rgba(0,0,0,.16); color: var(--color-brand-ink); display: flex; gap: .7rem; margin-top: 1.8rem; max-width: 43rem; padding: 0 .95rem; }
        .help-search svg { color: var(--color-brand-ink); flex: 0 0 auto; height: 1.25rem; width: 1.25rem; }
        .help-search input { background: transparent; border: 0; color: var(--color-brand-ink); font: inherit; min-height: 3.5rem; outline: 0; padding: 0; width: 100%; }
        .help-search input::placeholder { color: #718096; }
        .help-content { display: grid; gap: clamp(2.8rem, 6vw, 4.5rem); padding-top: clamp(2rem, 5vw, 4rem); }
        .help-section-heading { align-items: end; display: flex; gap: 1rem; justify-content: space-between; margin-bottom: 1.25rem; }
        .help-section-heading p { color: var(--color-brand-ink); font-size: .74rem; font-weight: 850; letter-spacing: .1em; margin: 0 0 .5rem; text-transform: uppercase; }
        .help-section-heading h2 { font-size: clamp(1.45rem, 3vw, 2.2rem); letter-spacing: -.04em; line-height: 1.14; margin: 0; }
        .help-all-topics { background: #fff; border: 1px solid #dce8f1; border-radius: 99px; color: #516174; cursor: pointer; font: inherit; font-size: .82rem; font-weight: 800; padding: .55rem .75rem; }
        .help-all-topics.active { background: var(--color-brand-ink); border-color: var(--color-brand-ink); color: #fff; }
        .help-category-grid { display: grid; gap: 1rem; grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .help-category-card { background: #fff; border: 1px solid #e2ebf3; border-radius: 1rem; color: var(--color-brand-ink); cursor: pointer; display: grid; grid-template-columns: auto 1fr auto; text-align: left; gap: .35rem .7rem; padding: 1rem; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
        .help-category-card:hover, .help-category-card.active { border-color: var(--color-brand-blue); box-shadow: 0 12px 25px rgba(10,27,53,.08); transform: translateY(-2px); }
        .help-category-card > span { align-items: center; background: var(--color-brand-soft); border-radius: .65rem; display: inline-flex; grid-row: span 2; height: 2.35rem; justify-content: center; width: 2.35rem; }
        .help-category-card span svg { height: 1.2rem; width: 1.2rem; }
        .help-category-card strong { align-self: end; font-size: .88rem; }
        .help-category-card small { color: #657589; font-size: .76rem; line-height: 1.4; }
        .help-category-card > svg { align-self: center; grid-row: span 2; height: 1rem; width: 1rem; }
        .help-faq-section { max-width: 56rem; }
        .help-result-count { color: #637286; font-size: .84rem; }
        .help-faq-list { display: grid; gap: .7rem; }
        .help-faq-item { background: #fff; border: 1px solid #e2ebf3; border-radius: .85rem; overflow: hidden; }
        .help-faq-item.open { border-color: rgba(99,184,243,.7); }
        .help-faq-item > button { align-items: center; background: transparent; border: 0; color: var(--color-brand-ink); cursor: pointer; display: flex; font: inherit; font-weight: 750; gap: 1rem; justify-content: space-between; padding: 1.05rem 1.15rem; text-align: left; width: 100%; }
        .help-faq-item > button svg { color: var(--color-brand-ink); flex: 0 0 auto; height: 1.15rem; width: 1.15rem; }
        .help-faq-item > div { border-top: 1px solid #e8eef4; padding: .9rem 1.15rem 1.15rem; }
        .help-faq-item p { color: #5d6d80; line-height: 1.7; margin: 0; }
        .help-empty-state { align-items: center; background: #fff; border: 1px dashed #c9dbe8; border-radius: 1rem; display: flex; flex-direction: column; padding: 2.5rem 1rem; text-align: center; }
        .help-empty-state svg { color: var(--color-brand-blue); height: 1.7rem; width: 1.7rem; }
        .help-empty-state h3 { margin: .8rem 0 .35rem; }
        .help-empty-state p { color: #627287; line-height: 1.6; margin: 0; max-width: 28rem; }
        .help-empty-state a { color: var(--color-brand-ink); font-weight: 800; margin-top: .8rem; }
        .help-support-card { align-items: center; background: var(--color-brand-ink); border-radius: 1.1rem; color: #fff; display: flex; gap: 1.25rem; justify-content: space-between; padding: clamp(1.35rem, 4vw, 2rem); }
        .help-support-card > div:first-child { display: grid; gap: .35rem .8rem; grid-template-columns: auto 1fr; }
        .help-support-card > div:first-child svg { color: var(--color-brand-blue); grid-row: span 2; height: 1.7rem; margin-top: .2rem; width: 1.7rem; }
        .help-support-card h2 { font-size: 1.25rem; margin: 0; }
        .help-support-card p { color: var(--color-primary-light); line-height: 1.55; margin: 0; }
        .help-support-actions { align-items: center; display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: .7rem; }
        .help-support-actions a { align-items: center; border-radius: .7rem; display: inline-flex; font-size: .88rem; font-weight: 800; gap: .4rem; padding: .72rem .9rem; text-decoration: none; }
        .help-support-actions a:first-child { background: #fff; color: var(--color-brand-ink); }
        .help-support-actions a:last-child { border: 1px solid rgba(255,255,255,.3); color: #fff; }
        .help-support-actions svg { height: 1rem; width: 1rem; }
        @media (max-width: 1050px) { .help-category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 720px) { .help-category-grid { grid-template-columns: 1fr; } .help-section-heading { align-items: flex-start; flex-direction: column; } .help-support-card { align-items: flex-start; flex-direction: column; } .help-support-actions { width: 100%; } .help-support-actions a { justify-content: center; width: 100%; } }
      `}</style>
    </main>
  )
}

export default HelpCenter
