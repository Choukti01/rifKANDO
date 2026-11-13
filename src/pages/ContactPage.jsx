import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightIcon,
  EnvelopeIcon,
  LifebuoyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const SUPPORT_EMAIL = 'rifkandoteam@gmail.com'

const ContactPage = () => {
  const { i18n } = useTranslation()
  const localize = (english, arabic) => (i18n.resolvedLanguage === 'ar' ? arabic : english)
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
            <p className="contact-eyebrow"><LifebuoyIcon aria-hidden="true" /> {localize('Contact support', 'تواصل مع الدعم')}</p>
            <h1>{localize('Tell us how we can help.', 'أخبرنا كيف يمكننا مساعدتك.')}</h1>
            <p>{localize('Whether you have a marketplace question, need seller guidance, or want to report an issue, our team is here to help.', 'سواء كان لديك سؤال عن السوق أو تحتاج إلى إرشاد للبائعين أو تريد الإبلاغ عن مشكلة، فريقنا هنا لمساعدتك.')}</p>
          </div>
          <div className="contact-hero-note"><UserGroupIcon aria-hidden="true" /><div><strong>{localize('Start with the details', 'ابدأ بالتفاصيل')}</strong><span>{localize('Share your account email, relevant order or listing information, and what you need help with.', 'شارك بريد حسابك ومعلومات الطلب أو الإعلان ذات الصلة وما تحتاج إلى مساعدة بشأنه.')}</span></div></div>
        </div>
      </section>

      <div className="container contact-content">
        <section className="contact-shortcuts" aria-label={localize('Support shortcuts', 'اختصارات الدعم')}>
          <Link to="/help"><LifebuoyIcon aria-hidden="true" /><span><strong>{localize('Visit Help Center', 'زيارة مركز المساعدة')}</strong><small>{localize('Browse common questions and answers', 'تصفّح الأسئلة والأجوبة الشائعة')}</small></span><ArrowRightIcon aria-hidden="true" /></Link>
          <Link to="/seller-guidelines"><UserGroupIcon aria-hidden="true" /><span><strong>{localize('Read the Seller Guide', 'اقرأ دليل البائع')}</strong><small>{localize('Review seller standards and fees', 'راجع معايير ورسوم البائعين')}</small></span><ArrowRightIcon aria-hidden="true" /></Link>
        </section>

        <div className="contact-grid-redesign">
          <section className="contact-details-card" aria-labelledby="contact-details-title">
            <p className="contact-card-kicker">{localize('Support details', 'تفاصيل الدعم')}</p>
            <h2 id="contact-details-title">{localize('Choose the best way to reach us.', 'اختر أفضل طريقة للتواصل معنا.')}</h2>
            <div className="contact-detail-list">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-detail"><span><EnvelopeIcon aria-hidden="true" /></span><div><strong>{localize('rifKANDO team', 'فريق rifKANDO')}</strong><small>{SUPPORT_EMAIL}</small></div></a>
              <div className="contact-detail static"><span><UserGroupIcon aria-hidden="true" /></span><div><strong>{localize('One inbox for every request', 'بريد واحد لكل الطلبات')}</strong><small>{localize('Buying, selling, delivery, FINDiT, courses, services, Food Market, account, and privacy support.', 'دعم الشراء والبيع والتوصيل وFINDiT والدورات والخدمات وسوق الطعام والحساب والخصوصية.')}</small></div></div>
            </div>
          </section>

          <section className="contact-form-card" aria-labelledby="contact-form-title">
            <p className="contact-card-kicker">{localize('Send an email', 'أرسل بريدًا إلكترونيًا')}</p>
            <h2 id="contact-form-title">{localize('Write your message.', 'اكتب رسالتك.')}</h2>
            <p className="contact-form-intro">{localize('Submitting this form opens your email application with a message addressed to rifKANDO support. You remain in control of sending it.', 'يؤدي إرسال هذا النموذج إلى فتح تطبيق البريد الإلكتروني برسالة موجهة إلى دعم rifKANDO. تبقى أنت المتحكم في إرسالها.')}</p>
            <form onSubmit={handleSubmit}>
              <div className="contact-form-row">
                <div><label htmlFor="contact-name">{localize('Your name', 'اسمك')}</label><input id="contact-name" type="text" autoComplete="name" value={formData.name} onChange={updateField('name')} required /></div>
                <div><label htmlFor="contact-email">{localize('Email address', 'البريد الإلكتروني')}</label><input id="contact-email" type="email" autoComplete="email" value={formData.email} onChange={updateField('email')} required /></div>
              </div>
              <div><label htmlFor="contact-subject">{localize('What can we help with?', 'كيف يمكننا مساعدتك؟')}</label><input id="contact-subject" type="text" value={formData.subject} onChange={updateField('subject')} placeholder={localize('For example, a question about an order', 'مثلًا، سؤال حول طلب')} required /></div>
              <div><label htmlFor="contact-message">{localize('Message', 'الرسالة')}</label><textarea id="contact-message" rows="6" value={formData.message} onChange={updateField('message')} placeholder={localize('Include any useful details so we can help faster.', 'أضف أي تفاصيل مفيدة لنتمكن من مساعدتك بسرعة.')} required /></div>
              <button type="submit">{localize('Open email message', 'فتح رسالة البريد الإلكتروني')} <ArrowRightIcon aria-hidden="true" /></button>
            </form>
          </section>
        </div>
      </div>

      <style>{`
        .contact-page-redesign { background: #f7fafc; color: var(--color-brand-ink); min-height: calc(100vh - 80px); padding-bottom: 5rem; }
        .contact-hero { background: linear-gradient(125deg, #07182f, var(--color-brand-ink) 58%, #164a78 145%); color: #fff; isolation: isolate; overflow: hidden; position: relative; }
        .contact-hero::after { background: radial-gradient(circle, rgba(99,184,243,.28), transparent 68%); content: ''; height: 34rem; pointer-events: none; position: absolute; right: -12rem; top: -18rem; width: 34rem; z-index: -1; }
        .contact-hero-grid { align-items: center; display: grid; gap: clamp(2rem, 7vw, 7rem); grid-template-columns: minmax(0, 1.25fr) minmax(14rem, .65fr); padding: clamp(4rem, 8vw, 6.5rem) 0; }
        .contact-eyebrow { align-items: center; color: #c9e9ff; display: flex; font-size: .76rem; font-weight: 800; gap: .5rem; letter-spacing: .1em; margin: 0 0 1rem; text-transform: uppercase; }
        .contact-eyebrow svg { height: 1.15rem; width: 1.15rem; }
        .contact-hero h1 { color: #fff; font-size: clamp(2.35rem, 5vw, 4.2rem); letter-spacing: -.055em; line-height: 1.04; margin: 0; }
        .contact-hero > .container > div > p:not(.contact-eyebrow) { color: #e5f4ff; font-size: 1.08rem; line-height: 1.75; margin: 1.25rem 0 0; max-width: 42rem; }
        .contact-hero-note { align-items: flex-start; background: linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.07)); border: 1px solid rgba(201,233,255,.3); border-radius: 1.1rem; box-shadow: 0 20px 46px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.16); display: flex; gap: .8rem; padding: 1.25rem; }
        .contact-hero-note > svg { color: var(--color-brand-blue); flex: 0 0 auto; height: 1.55rem; width: 1.55rem; }
        .contact-hero-note strong { display: block; margin-bottom: .35rem; }
        .contact-hero-note span { color: #e5f4ff; display: block; font-size: .87rem; line-height: 1.55; }
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
