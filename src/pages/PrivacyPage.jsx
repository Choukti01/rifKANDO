import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DocumentTextIcon,
  EyeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const PrivacyPage = () => {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage === 'ar' ? 'ar' : i18n.resolvedLanguage === 'fr' ? 'fr' : 'en'
  const copy = {
    en: {
      eyebrow: 'Your privacy on rifKANDO', title: 'Clear, respectful handling of your information.', lead: 'This policy explains what information rifKANDO collects, why we use it, and the choices you have as a member of our marketplace.', updated: 'Last updated: 10 August 2026', choices: 'Your privacy choices', nav: 'Privacy policy navigation', onPage: 'On this page', information: 'Information we collect', use: 'How we use information', sharing: 'When information is shared', security: 'Security and retention', cookies: 'Cookies and preferences', rights: 'Your rights', children: 'Children’s privacy', updates: 'Policy updates', contact: 'Contact',
      noSell: 'We do not sell personal information', noSellLead: 'We use information to operate rifKANDO and complete the services you choose.', limited: 'Access is purpose limited', limitedLead: 'Information is shared only when it is needed to deliver, support, or protect the platform.', choicesTitle: 'You have choices', choicesLead: 'You can ask to access, correct, or delete eligible personal information.',
      informationLead: 'We collect information you provide when you create an account, use marketplace features, make a purchase, become a seller, or contact support.', account: 'Account and profile details', accountLead: 'Your name, email address, phone number, and profile details.', activity: 'Marketplace activity', activityLead: 'Order, FINDit request, course, service, listing, and support information needed to operate the service.', payments: 'Payment and payout records', paymentsLead: 'Transaction and wallet records needed to process payments, refunds, withdrawals, and fraud checks.', seller: 'Seller workspace details', sellerLead: 'Seller workspace choices and account activity needed to operate the marketplace.',
      useLead: 'We use information to create and secure accounts, complete transactions, provide customer support, communicate important service updates, improve the platform, and help prevent fraud or misuse.', sharingLead: 'We do not sell your personal information. We share the minimum information needed with sellers, buyers, and service providers to complete a transaction or FINDit order, process payments, provide support, and operate rifKANDO.', securityLead: 'We use safeguards such as authenticated access controls, secure sessions, restricted document access, and activity logging to help protect information. No online system can guarantee absolute security, so we continuously review our protections.', retentionLead: 'We retain information only for as long as needed to provide the service, meet legal obligations, resolve disputes, and enforce our agreements.', cookiesLead: 'rifKANDO uses cookies and local browser storage to maintain secure sessions, protect requests, and remember settings such as language preferences. You can manage cookies through your browser settings, but essential platform features may not work correctly if you disable them.', rightsLead: 'You may ask to access, correct, or delete your personal information, subject to applicable legal and transaction-record retention requirements.', privacySupport: 'Contact privacy support', childrenLead: 'rifKANDO is not intended for children under 13. We do not knowingly collect personal information from children under 13.', updatesLead: 'We may update this policy as rifKANDO evolves. When we do, we will publish the revised version on this page and update the date above.', questions: 'Privacy questions?', questionsLead: 'For privacy requests or questions about this policy, email', contactUs: 'Contact us',
    },
    fr: {
      eyebrow: 'Votre vie privée sur rifKANDO', title: 'Une gestion claire et respectueuse de vos informations.', lead: 'Cette politique explique les informations que rifKANDO collecte, pourquoi nous les utilisons et les choix dont vous disposez en tant que membre de notre place de marché.', updated: 'Dernière mise à jour : 10 août 2026', choices: 'Vos choix de confidentialité', nav: 'Navigation de la politique de confidentialité', onPage: 'Sur cette page', information: 'Informations collectées', use: 'Utilisation des informations', sharing: 'Quand les informations sont partagées', security: 'Sécurité et conservation', cookies: 'Cookies et préférences', rights: 'Vos droits', children: 'Vie privée des enfants', updates: 'Mises à jour de la politique', contact: 'Contact',
      noSell: 'Nous ne vendons pas vos informations personnelles', noSellLead: 'Nous utilisons les informations pour faire fonctionner rifKANDO et fournir les services que vous choisissez.', limited: 'L’accès est limité à son objectif', limitedLead: 'Les informations ne sont partagées que lorsqu’elles sont nécessaires pour livrer, assister ou protéger la plateforme.', choicesTitle: 'Vous avez le choix', choicesLead: 'Vous pouvez demander l’accès, la rectification ou la suppression de vos informations personnelles éligibles.',
      informationLead: 'Nous collectons les informations que vous fournissez lorsque vous créez un compte, utilisez les fonctionnalités de la place de marché, effectuez un achat, devenez vendeur ou contactez l’assistance.', account: 'Informations de compte et de profil', accountLead: 'Votre nom, adresse e-mail, numéro de téléphone et informations de profil.', activity: 'Activité sur la place de marché', activityLead: 'Les informations de commande, demande Trouvez-le, cours, service, annonce et assistance nécessaires au fonctionnement du service.', payments: 'Registres de paiement et de versement', paymentsLead: 'Les registres de transaction et de portefeuille nécessaires aux paiements, remboursements, retraits et contrôles de fraude.', seller: 'Informations sur l’espace vendeur', sellerLead: 'Les choix d’espace vendeur et l’activité du compte nécessaires au fonctionnement de la place de marché.',
      useLead: 'Nous utilisons les informations pour créer et sécuriser les comptes, finaliser les transactions, fournir l’assistance client, communiquer les mises à jour importantes, améliorer la plateforme et prévenir la fraude ou les abus.', sharingLead: 'Nous ne vendons pas vos informations personnelles. Nous partageons le minimum nécessaire avec les vendeurs, acheteurs et prestataires afin de finaliser une transaction ou une commande Trouvez-le, traiter les paiements, fournir l’assistance et exploiter rifKANDO.', securityLead: 'Nous utilisons des protections telles que des contrôles d’accès authentifiés, des sessions sécurisées, un accès restreint aux documents et une journalisation des activités. Aucun système en ligne ne peut garantir une sécurité absolue ; nous révisons donc continuellement nos protections.', retentionLead: 'Nous conservons les informations uniquement pendant la durée nécessaire à la fourniture du service, au respect des obligations légales, au règlement des litiges et à l’application de nos accords.', cookiesLead: 'rifKANDO utilise des cookies et le stockage local du navigateur pour maintenir des sessions sécurisées, protéger les demandes et mémoriser des réglages tels que la langue. Vous pouvez gérer les cookies dans votre navigateur, mais des fonctions essentielles peuvent ne plus fonctionner correctement si vous les désactivez.', rightsLead: 'Vous pouvez demander l’accès, la rectification ou la suppression de vos informations personnelles, sous réserve des obligations légales applicables de conservation des données et des transactions.', privacySupport: 'Contacter l’assistance confidentialité', childrenLead: 'rifKANDO n’est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas sciemment d’informations personnelles auprès d’enfants de moins de 13 ans.', updatesLead: 'Nous pouvons mettre à jour cette politique à mesure que rifKANDO évolue. Dans ce cas, nous publierons la version révisée sur cette page et mettrons à jour la date ci-dessus.', questions: 'Des questions sur la confidentialité ?', questionsLead: 'Pour toute demande ou question relative à la confidentialité, écrivez à', contactUs: 'Nous contacter',
    },
    ar: {
      eyebrow: 'خصوصيتك في rifKANDO', title: 'تعامل واضح ومحترم مع معلوماتك.', lead: 'توضح هذه السياسة المعلومات التي تجمعها rifKANDO وسبب استخدامها والخيارات المتاحة لك بصفتك عضوًا في منصتنا.', updated: 'آخر تحديث: 10 أغسطس 2026', choices: 'خيارات خصوصيتك', nav: 'تنقل سياسة الخصوصية', onPage: 'في هذه الصفحة', information: 'المعلومات التي نجمعها', use: 'كيف نستخدم المعلومات', sharing: 'متى نشارك المعلومات', security: 'الأمان والاحتفاظ بالبيانات', cookies: 'ملفات الارتباط والتفضيلات', rights: 'حقوقك', children: 'خصوصية الأطفال', updates: 'تحديثات السياسة', contact: 'التواصل',
      noSell: 'لا نبيع المعلومات الشخصية', noSellLead: 'نستخدم المعلومات لتشغيل rifKANDO وإتمام الخدمات التي تختارها.', limited: 'الوصول محدود بالغرض', limitedLead: 'لا تُشارك المعلومات إلا عند الحاجة للتوصيل أو الدعم أو حماية المنصة.', choicesTitle: 'لديك خيارات', choicesLead: 'يمكنك طلب الوصول إلى معلوماتك الشخصية المؤهلة أو تصحيحها أو حذفها.',
      informationLead: 'نجمع المعلومات التي تقدمها عند إنشاء حساب أو استخدام ميزات المنصة أو إجراء شراء أو بدء البيع أو التواصل مع الدعم.', account: 'تفاصيل الحساب والملف الشخصي', accountLead: 'اسمك وبريدك الإلكتروني ورقم هاتفك وتفاصيل ملفك الشخصي.', activity: 'نشاط المنصة', activityLead: 'معلومات الطلبات وطلبات جدها والدورات والخدمات والإعلانات والدعم اللازمة لتشغيل الخدمة.', payments: 'سجلات الدفع والمستحقات', paymentsLead: 'سجلات المعاملات والمحفظة اللازمة لمعالجة المدفوعات والاستردادات والسحوبات وفحوصات الاحتيال.', seller: 'تفاصيل مساحة البائع', sellerLead: 'اختيارات مساحة البائع ونشاط الحساب اللازمين لتشغيل المنصة.',
      useLead: 'نستخدم المعلومات لإنشاء الحسابات وتأمينها وإتمام المعاملات وتقديم دعم العملاء وإبلاغك بالتحديثات المهمة وتحسين المنصة والمساعدة في منع الاحتيال أو إساءة الاستخدام.', sharingLead: 'لا نبيع معلوماتك الشخصية. نشارك الحد الأدنى اللازم مع البائعين والمشترين ومقدمي الخدمات لإتمام معاملة أو طلب جدها ومعالجة المدفوعات وتقديم الدعم وتشغيل rifKANDO.', securityLead: 'نستخدم وسائل حماية مثل ضوابط الوصول الموثقة والجلسات الآمنة والوصول المقيد للوثائق وتسجيل النشاطات للمساعدة في حماية المعلومات. لا يمكن لأي نظام عبر الإنترنت ضمان الأمان المطلق، لذلك نراجع إجراءات الحماية باستمرار.', retentionLead: 'نحتفظ بالمعلومات فقط للمدة اللازمة لتقديم الخدمة والوفاء بالالتزامات القانونية وحل النزاعات وتنفيذ اتفاقياتنا.', cookiesLead: 'تستخدم rifKANDO ملفات الارتباط والتخزين المحلي في المتصفح للحفاظ على الجلسات الآمنة وحماية الطلبات وتذكر تفضيلات مثل اللغة. يمكنك إدارة ملفات الارتباط من إعدادات المتصفح، لكن ميزات أساسية قد لا تعمل بشكل صحيح إذا عطلتها.', rightsLead: 'يمكنك طلب الوصول إلى معلوماتك الشخصية أو تصحيحها أو حذفها، مع مراعاة متطلبات الاحتفاظ القانونية وسجلات المعاملات.', privacySupport: 'تواصل مع دعم الخصوصية', childrenLead: 'rifKANDO غير مخصصة للأطفال دون سن 13 عامًا. لا نجمع عمدًا معلومات شخصية من الأطفال دون 13 عامًا.', updatesLead: 'قد نحدّث هذه السياسة مع تطور rifKANDO. عند ذلك، سننشر النسخة المحدثة في هذه الصفحة ونحدّث التاريخ أعلاه.', questions: 'أسئلة عن الخصوصية؟', questionsLead: 'لطلبات الخصوصية أو الأسئلة حول هذه السياسة، راسلنا على', contactUs: 'تواصل معنا',
    },
  }[language]
  return (
    <main className="privacy-page">
      <div className="privacy-hero">
        <div className="container">
          <div className="privacy-hero-content">
            <div className="privacy-eyebrow">
              <ShieldCheckIcon aria-hidden="true" />
              <span>{copy.eyebrow}</span>
            </div>
            <h1>{copy.title}</h1>
            <p>{copy.lead}</p>
            <div className="privacy-meta">
              <span>{copy.updated}</span>
              <span aria-hidden="true">•</span>
              <a href="#your-rights">{copy.choices}</a>
            </div>
          </div>
        </div>
      </div>

      <div className="container privacy-layout">
        <aside className="privacy-navigation" aria-label={copy.nav}>
          <p className="privacy-navigation-title">{copy.onPage}</p>
          <nav>
            <a href="#information">{copy.information}</a>
            <a href="#use">{copy.use}</a>
            <a href="#sharing">{copy.sharing}</a>
            <a href="#security">{copy.security}</a>
            <a href="#cookies">{copy.cookies}</a>
            <a href="#your-rights">{copy.rights}</a>
            <a href="#children">{copy.children}</a>
            <a href="#updates">{copy.updates}</a>
            <a href="#contact">{copy.contact}</a>
          </nav>
        </aside>

        <div className="privacy-main-content">
          <section className="privacy-promises" aria-label="Privacy commitments">
            <article>
              <EyeIcon aria-hidden="true" />
              <h2>{copy.noSell}</h2>
              <p>{copy.noSellLead}</p>
            </article>
            <article>
              <LockClosedIcon aria-hidden="true" />
              <h2>{copy.limited}</h2>
              <p>{copy.limitedLead}</p>
            </article>
            <article>
              <UserGroupIcon aria-hidden="true" />
              <h2>{copy.choicesTitle}</h2>
              <p>{copy.choicesLead}</p>
            </article>
          </section>

          <div className="privacy-policy-card">
            <section id="information" className="privacy-section">
              <div className="privacy-section-number">01</div>
              <div>
                <h2>{copy.information}</h2>
                <p>{copy.informationLead}</p>
                <div className="privacy-detail-grid">
                  <div>
                    <h3>{copy.account}</h3>
                    <p>{copy.accountLead}</p>
                  </div>
                  <div>
                    <h3>{copy.activity}</h3>
                    <p>{copy.activityLead}</p>
                  </div>
                  <div>
                    <h3>{copy.payments}</h3>
                    <p>{copy.paymentsLead}</p>
                  </div>
                  <div>
                    <h3>{copy.seller}</h3>
                    <p>{copy.sellerLead}</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="use" className="privacy-section">
              <div className="privacy-section-number">02</div>
              <div>
                <h2>{copy.use}</h2>
                <p>{copy.useLead}</p>
              </div>
            </section>

            <section id="sharing" className="privacy-section">
              <div className="privacy-section-number">03</div>
              <div>
                <h2>{copy.sharing}</h2>
                <p>{copy.sharingLead}</p>
              </div>
            </section>

            <section id="security" className="privacy-section">
              <div className="privacy-section-number">04</div>
              <div>
                <h2>{copy.security}</h2>
                <p>{copy.securityLead}</p>
                <p>{copy.retentionLead}</p>
              </div>
            </section>

            <section id="cookies" className="privacy-section">
              <div className="privacy-section-number">05</div>
              <div>
                <h2>{copy.cookies}</h2>
                <p>{copy.cookiesLead}</p>
              </div>
            </section>

            <section id="your-rights" className="privacy-section privacy-rights-section">
              <div className="privacy-section-number">06</div>
              <div>
                <h2>{copy.rights}</h2>
                <p>{copy.rightsLead}</p>
              <a href="mailto:rifkandoteam@gmail.com" className="privacy-action">
                  {copy.privacySupport}
                  <span aria-hidden="true">→</span>
              </a>
              </div>
            </section>

            <section id="children" className="privacy-section">
              <div className="privacy-section-number">07</div>
              <div>
                <h2>{copy.children}</h2>
                <p>{copy.childrenLead}</p>
              </div>
            </section>

            <section id="updates" className="privacy-section">
              <div className="privacy-section-number">08</div>
              <div>
                <h2>{copy.updates}</h2>
                <p>{copy.updatesLead}</p>
              </div>
            </section>

            <section id="contact" className="privacy-contact">
              <DocumentTextIcon aria-hidden="true" />
              <div>
                <h2>{copy.questions}</h2>
                <p>{copy.questionsLead} <a href="mailto:rifkandoteam@gmail.com">rifkandoteam@gmail.com</a>.</p>
              </div>
              <Link to="/contact">{copy.contactUs}</Link>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .privacy-page { min-height: calc(100vh - 80px); background: #f7fafc; color: #172033; padding-bottom: 5rem; }
        .privacy-hero { background: linear-gradient(128deg, #07182f 0%, var(--color-brand-ink) 58%, #164a78 145%); color: #fff; overflow: hidden; position: relative; }
        .privacy-hero::after { background: radial-gradient(circle, rgba(99,184,243,.3), transparent 68%); content: ''; height: 32rem; position: absolute; right: -11rem; top: -17rem; width: 32rem; }
        .privacy-hero-content { max-width: 48rem; padding: clamp(4.5rem, 9vw, 7rem) 0 clamp(3.5rem, 7vw, 5rem); position: relative; z-index: 1; }
        .privacy-eyebrow { align-items: center; color: #c9e9ff; display: inline-flex; font-size: .82rem; font-weight: 800; gap: .55rem; letter-spacing: .08em; text-transform: uppercase; }
        .privacy-eyebrow svg { height: 1.2rem; width: 1.2rem; }
        .privacy-hero h1 { color: #fff; font-size: clamp(2.35rem, 5vw, 4.25rem); letter-spacing: -.045em; line-height: 1.04; margin: 1.1rem 0; max-width: 44rem; }
        .privacy-hero p { color: #e5f4ff; font-size: clamp(1rem, 2vw, 1.2rem); line-height: 1.75; margin: 0; max-width: 43rem; }
        .privacy-meta { align-items: center; color: #c9e9ff; display: flex; flex-wrap: wrap; font-size: .9rem; gap: .65rem; margin-top: 1.5rem; }
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
