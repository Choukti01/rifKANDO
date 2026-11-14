import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightIcon,
  CheckIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import { formatCommissionRate } from '../../config/commissionPolicy'

const feeCategories = [
  { type: 'product', label: 'Physical products' },
  { type: 'course', label: 'Courses' },
  { type: 'service', label: 'Services' },
  { type: 'product', label: 'Food Market' },
  { type: 'findit', label: 'FINDit solutions' },
]

const SellerGuidelines = () => {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage === 'ar' ? 'ar' : i18n.resolvedLanguage === 'fr' ? 'fr' : 'en'
  const translated = {
    fr: {
      'Seller guide': 'Guide du vendeur', 'Build a seller experience customers can trust.': 'Créez une expérience vendeur digne de confiance.', 'A clear guide to setting up, publishing quality listings, managing customer expectations, and understanding how rifKANDO seller fees work.': 'Un guide clair pour vous installer, publier des annonces de qualité, gérer les attentes des clients et comprendre le fonctionnement des frais vendeur rifKANDO.', 'Become a seller': 'Devenir vendeur', 'View fees and pricing': 'Voir les frais et tarifs', 'Seller journey': 'Parcours vendeur', 'Choose your workspace': 'Choisissez votre espace', 'Complete your profile': 'Complétez votre profil', 'Publish with confidence': 'Publiez en toute confiance', 'Seller guide navigation': 'Navigation du guide vendeur', 'In this guide': 'Dans ce guide', 'Getting started': 'Bien démarrer', 'Listing standards': 'Règles des annonces', 'Fees and wallet': 'Frais et portefeuille', 'Customer care': 'Service client', 'Marketplace conduct': 'Règles de la place de marché', 'Set a strong foundation before your first listing goes live.': 'Posez de bonnes bases avant de publier votre première annonce.', 'Create your account': 'Créez votre compte', 'Use accurate, current account and contact details before you start selling.': 'Utilisez des informations de compte et de contact exactes et à jour avant de commencer à vendre.', 'Choose your seller workspace': 'Choisissez votre espace vendeur', 'Select Products, Courses, Services, or Food Market to open the tools that match your business. FINDit is available to every seller who can solve buyer requests.': 'Sélectionnez Produits, Cours, Services ou Marché alimentaire pour ouvrir les outils adaptés à votre activité. Trouvez-le est disponible pour chaque vendeur capable de répondre aux demandes des acheteurs.', 'Keep your profile current': 'Gardez votre profil à jour', 'Make sure your name, business details, and customer-facing information remain accurate.': 'Veillez à ce que votre nom, vos informations professionnelles et vos informations destinées aux clients restent exacts.', 'Strong listings make it easier for customers to make an informed decision.': 'Des annonces solides permettent aux clients de prendre une décision éclairée.', 'Use clear, accurate titles, descriptions, prices, and specifications.': 'Utilisez des titres, descriptions, prix et spécifications clairs et exacts.', 'Use original, high-quality images or media that honestly represent the offer.': 'Utilisez des images ou médias originaux et de qualité qui représentent honnêtement votre offre.', 'Set realistic availability, delivery, lesson, service, or FINDit fulfillment expectations.': 'Indiquez une disponibilité et des attentes réalistes de livraison, cours, service ou réalisation Trouvez-le.', 'Only publish content you are allowed to sell, distribute, or use commercially.': 'Ne publiez que du contenu que vous êtes autorisé à vendre, distribuer ou utiliser commercialement.', 'Fees and settlement': 'Frais et règlement', 'rifKANDO applies a 5% marketplace commission to the applicable completed sale. Delivery fees are separate and never form part of the rifKANDO commission.': 'rifKANDO applique une commission de 5 % à la vente finalisée concernée. Les frais de livraison sont distincts et ne font jamais partie de la commission rifKANDO.', 'For COD orders, confirm the order and prepare the parcel for the delivery coordination shown in your order workspace. rifKANDO’s operations team records the handoff, delivery outcome, delivery fee, and settlement steps. Pay the 5% commission using the reference in your workspace within three days after delivery is confirmed. Unpaid overdue commission can pause new sales until finance verifies payment.': 'Pour les commandes COD, confirmez la commande et préparez le colis selon les informations de coordination affichées dans votre espace commandes. L’équipe opérations rifKANDO enregistre la remise, le résultat de livraison, les frais de livraison et les étapes de règlement. Payez la commission de 5 % avec la référence de votre espace dans les trois jours suivant la confirmation de livraison. Une commission échue non réglée peut suspendre les nouvelles ventes jusqu’à vérification par la finance.', 'Customer care and fulfillment': 'Service client et exécution', 'Reliability builds trust, repeat business, and a healthier marketplace.': 'La fiabilité crée la confiance, la fidélité et une place de marché plus saine.', Do: 'À faire', Avoid: 'À éviter', 'Meet the delivery or service timeframe you communicate.': 'Respectez le délai de livraison ou de service annoncé.', 'Respond to customer questions promptly and professionally.': 'Répondez aux questions des clients rapidement et avec professionnalisme.', 'Keep customers informed when an order or FINDit request changes.': 'Tenez les clients informés lorsqu’une commande ou une demande Trouvez-le change.', 'Misleading product details, hidden conditions, or unavailable inventory.': 'Des détails trompeurs, des conditions cachées ou un stock indisponible.', 'Requesting payments outside rifKANDO for marketplace activity.': 'Demander des paiements hors de rifKANDO pour une activité de la place de marché.', 'Using customer information for purposes unrelated to the transaction.': 'Utiliser les informations client à des fins non liées à la transaction.', 'rifKANDO does not allow illegal, counterfeit, harmful, discriminatory, adult, or copyright-infringing content and products.': 'rifKANDO n’autorise pas les contenus ou produits illégaux, contrefaits, dangereux, discriminatoires, réservés aux adultes ou portant atteinte aux droits d’auteur.', 'Listings or accounts that breach these standards may be reviewed, removed, restricted, or suspended. Serious or repeated violations can lead to account termination, subject to the Terms of Service and applicable law.': 'Les annonces ou comptes qui enfreignent ces règles peuvent être examinés, retirés, limités ou suspendus. Les violations graves ou répétées peuvent entraîner la fermeture du compte, conformément aux Conditions d’utilisation et à la loi applicable.', 'Need help setting up?': 'Besoin d’aide pour démarrer ?', 'Our support team can help you choose the right seller workspace or understand your seller tools.': 'Notre équipe peut vous aider à choisir le bon espace vendeur ou à comprendre vos outils.', 'Contact support': 'Contacter l’assistance',
    },
    ar: {
      'Seller guide': 'دليل البائع', 'Build a seller experience customers can trust.': 'أنشئ تجربة بيع يثق بها العملاء.', 'A clear guide to setting up, publishing quality listings, managing customer expectations, and understanding how rifKANDO seller fees work.': 'دليل واضح لإعداد حسابك ونشر إعلانات جيدة وإدارة توقعات العملاء وفهم رسوم البائع في rifKANDO.', 'Become a seller': 'كن بائعًا', 'View fees and pricing': 'اطلع على الرسوم والأسعار', 'Seller journey': 'رحلة البائع', 'Choose your workspace': 'اختر مساحة عملك', 'Complete your profile': 'أكمل ملفك الشخصي', 'Publish with confidence': 'انشر بثقة', 'Seller guide navigation': 'تنقل دليل البائع', 'In this guide': 'في هذا الدليل', 'Getting started': 'البداية', 'Listing standards': 'معايير الإعلان', 'Fees and wallet': 'الرسوم والمحفظة', 'Customer care': 'رعاية العملاء', 'Marketplace conduct': 'سلوك المنصة', 'Set a strong foundation before your first listing goes live.': 'ضع أساسًا قويًا قبل نشر إعلانك الأول.', 'Create your account': 'أنشئ حسابك', 'Use accurate, current account and contact details before you start selling.': 'استخدم بيانات حساب وتواصل دقيقة وحديثة قبل بدء البيع.', 'Choose your seller workspace': 'اختر مساحة البائع', 'Select Products, Courses, Services, or Food Market to open the tools that match your business. FINDit is available to every seller who can solve buyer requests.': 'اختر المنتجات أو الدورات أو الخدمات أو سوق المأكولات لفتح الأدوات المناسبة لنشاطك. جدها متاحة لكل بائع يمكنه حل طلبات المشترين.', 'Keep your profile current': 'حافظ على تحديث ملفك', 'Make sure your name, business details, and customer-facing information remain accurate.': 'تأكد من بقاء اسمك وتفاصيل عملك ومعلوماتك الظاهرة للعملاء دقيقة.', 'Strong listings make it easier for customers to make an informed decision.': 'تساعد الإعلانات القوية العملاء على اتخاذ قرار واعٍ.', 'Use clear, accurate titles, descriptions, prices, and specifications.': 'استخدم عناوين وأوصافًا وأسعارًا ومواصفات واضحة ودقيقة.', 'Use original, high-quality images or media that honestly represent the offer.': 'استخدم صورًا أو وسائط أصلية وعالية الجودة تمثل العرض بصدق.', 'Set realistic availability, delivery, lesson, service, or FINDit fulfillment expectations.': 'حدّد توقعات واقعية للتوفر والتوصيل والدروس والخدمات أو تنفيذ طلبات جدها.', 'Only publish content you are allowed to sell, distribute, or use commercially.': 'انشر فقط محتوى مسموحًا لك ببيعه أو توزيعه أو استخدامه تجاريًا.', 'Fees and settlement': 'الرسوم والتسوية', 'rifKANDO applies a 5% marketplace commission to the applicable completed sale. Delivery fees are separate and never form part of the rifKANDO commission.': 'تطبق rifKANDO عمولة سوق بنسبة 5% على البيع المكتمل المعني. رسوم التوصيل منفصلة ولا تدخل أبدًا ضمن عمولة rifKANDO.', 'Customer care and fulfillment': 'رعاية العملاء والتنفيذ', 'Reliability builds trust, repeat business, and a healthier marketplace.': 'الموثوقية تبني الثقة وتكرار التعامل وسوقًا أكثر صحة.', Do: 'افعل', Avoid: 'تجنب', 'Meet the delivery or service timeframe you communicate.': 'التزم بموعد التوصيل أو الخدمة الذي تعلنه.', 'Respond to customer questions promptly and professionally.': 'أجب عن أسئلة العملاء بسرعة واحترافية.', 'Keep customers informed when an order or FINDit request changes.': 'أبق العملاء على اطلاع عند تغيّر طلب أو طلب جدها.', 'Misleading product details, hidden conditions, or unavailable inventory.': 'تفاصيل مضللة أو شروط مخفية أو مخزون غير متاح.', 'Requesting payments outside rifKANDO for marketplace activity.': 'طلب مدفوعات خارج rifKANDO لنشاط في المنصة.', 'Using customer information for purposes unrelated to the transaction.': 'استخدام معلومات العملاء لأغراض لا تتعلق بالمعاملة.', 'rifKANDO does not allow illegal, counterfeit, harmful, discriminatory, adult, or copyright-infringing content and products.': 'لا تسمح rifKANDO بالمحتوى أو المنتجات غير القانونية أو المقلدة أو الضارة أو التمييزية أو المخصصة للبالغين أو المخالفة لحقوق النشر.', 'Listings or accounts that breach these standards may be reviewed, removed, restricted, or suspended. Serious or repeated violations can lead to account termination, subject to the Terms of Service and applicable law.': 'قد تتم مراجعة الإعلانات أو الحسابات التي تخالف هذه المعايير أو إزالتها أو تقييدها أو تعليقها. يمكن أن تؤدي المخالفات الخطيرة أو المتكررة إلى إنهاء الحساب وفقًا لشروط الخدمة والقانون المعمول به.', 'Need help setting up?': 'هل تحتاج مساعدة في الإعداد؟', 'Our support team can help you choose the right seller workspace or understand your seller tools.': 'يمكن لفريق الدعم مساعدتك في اختيار مساحة البائع المناسبة أو فهم أدواتك.', 'Contact support': 'تواصل مع الدعم',
    },
  }[language] || {}
  if (language === 'ar') translated['For COD orders, confirm the order and prepare the parcel for the delivery coordination shown in your order workspace. rifKANDO’s operations team records the handoff, delivery outcome, delivery fee, and settlement steps. Pay the 5% commission using the reference in your workspace within three days after delivery is confirmed. Unpaid overdue commission can pause new sales until finance verifies payment.'] = 'بالنسبة لطلبات الدفع عند الاستلام، أكّد الطلب وجهّز الطرد وفق تنسيق التوصيل الظاهر في مساحة الطلبات. يسجل فريق عمليات rifKANDO تسليم الطرد ونتيجة التوصيل ورسم التوصيل وخطوات التسوية. ادفع عمولة 5% باستخدام المرجع الموجود في مساحة عملك خلال ثلاثة أيام من تأكيد التوصيل. قد يؤدي تأخر العمولة غير المدفوعة إلى إيقاف المبيعات الجديدة حتى تتحقق الإدارة المالية من الدفع.'
  const localize = (english) => translated[english] || english
  const localizedFeeCategories = feeCategories.map((category) => ({ ...category, label: localize(category.label) }))
  return (
    <main className="seller-guide-page">
      <section className="seller-guide-hero">
        <div className="container seller-guide-hero-grid">
          <div>
            <p className="seller-guide-eyebrow"><ShieldCheckIcon aria-hidden="true" /> {localize('Seller guide')}</p>
            <h1>{localize('Build a seller experience customers can trust.')}</h1>
            <p className="seller-guide-intro">
              {localize('A clear guide to setting up, publishing quality listings, managing customer expectations, and understanding how rifKANDO seller fees work.')}
            </p>
            <div className="seller-guide-actions">
              <Link to="/choose-seller-type" className="seller-guide-primary-action">{localize('Become a seller')} <ArrowRightIcon aria-hidden="true" /></Link>
              <Link to="/pricing" className="seller-guide-secondary-action">{localize('View fees and pricing')}</Link>
            </div>
          </div>
          <div className="seller-guide-hero-card">
            <span>{localize('Seller journey')}</span>
            <ol>
              <li><strong>1</strong> {localize('Choose your workspace')}</li>
              <li><strong>2</strong> {localize('Complete your profile')}</li>
              <li><strong>3</strong> {localize('Publish with confidence')}</li>
            </ol>
          </div>
        </div>
      </section>

      <div className="container seller-guide-layout">
        <aside className="seller-guide-nav" aria-label={localize('Seller guide navigation')}>
          <p>{localize('In this guide')}</p>
          <a href="#start">{localize('Getting started')}</a>
          <a href="#listings">{localize('Listing standards')}</a>
          <a href="#fees">{localize('Fees and wallet')}</a>
          <a href="#fulfillment">{localize('Customer care')}</a>
          <a href="#conduct">{localize('Marketplace conduct')}</a>
        </aside>

        <div className="seller-guide-content">
          <section id="start" className="seller-guide-section">
            <div className="seller-guide-section-heading">
              <span>01</span>
              <div>
                <h2>{localize('Getting started')}</h2>
                <p>{localize('Set a strong foundation before your first listing goes live.')}</p>
              </div>
            </div>
            <div className="seller-guide-steps">
              <article><UserPlusIcon aria-hidden="true" /><h3>{localize('Create your account')}</h3><p>{localize('Use accurate, current account and contact details before you start selling.')}</p></article>
              <article><DocumentCheckIcon aria-hidden="true" /><h3>{localize('Choose your seller workspace')}</h3><p>{localize('Select Products, Courses, Services, or Food Market to open the tools that match your business. FINDit is available to every seller who can solve buyer requests.')}</p></article>
              <article><ShieldCheckIcon aria-hidden="true" /><h3>{localize('Keep your profile current')}</h3><p>{localize('Make sure your name, business details, and customer-facing information remain accurate.')}</p></article>
            </div>
          </section>

          <section id="listings" className="seller-guide-section">
            <div className="seller-guide-section-heading">
              <span>02</span>
              <div>
                <h2>{localize('Listing standards')}</h2>
                <p>{localize('Strong listings make it easier for customers to make an informed decision.')}</p>
              </div>
            </div>
            <div className="seller-guide-checklist">
              <div><CheckIcon aria-hidden="true" /><span>{localize('Use clear, accurate titles, descriptions, prices, and specifications.')}</span></div>
              <div><CheckIcon aria-hidden="true" /><span>{localize('Use original, high-quality images or media that honestly represent the offer.')}</span></div>
              <div><CheckIcon aria-hidden="true" /><span>{localize('Set realistic availability, delivery, lesson, service, or FINDit fulfillment expectations.')}</span></div>
              <div><CheckIcon aria-hidden="true" /><span>{localize('Only publish content you are allowed to sell, distribute, or use commercially.')}</span></div>
            </div>
          </section>

          <section id="fees" className="seller-guide-section seller-guide-fees-section">
            <div className="seller-guide-section-heading">
              <span>03</span>
              <div>
                <h2>{localize('Fees and settlement')}</h2>
                <p>{localize('rifKANDO applies a 5% marketplace commission to the applicable completed sale. Delivery fees are separate and never form part of the rifKANDO commission.')}</p>
              </div>
            </div>
            <div className="seller-guide-fee-grid">
              {localizedFeeCategories.map((category) => (
                <div key={category.type}>
                  <span>{category.label}</span>
                  <strong>{formatCommissionRate(category.type)}</strong>
                </div>
              ))}
            </div>
            <div className="seller-guide-wallet-note">
              <CurrencyDollarIcon aria-hidden="true" />
              <p>{localize('For COD orders, confirm the order and prepare the parcel for the delivery coordination shown in your order workspace. rifKANDO’s operations team records the handoff, delivery outcome, delivery fee, and settlement steps. Pay the 5% commission using the reference in your workspace within three days after delivery is confirmed. Unpaid overdue commission can pause new sales until finance verifies payment.')}</p>
            </div>
          </section>

          <section id="fulfillment" className="seller-guide-section">
            <div className="seller-guide-section-heading">
              <span>04</span>
              <div>
                <h2>{localize('Customer care and fulfillment')}</h2>
                <p>{localize('Reliability builds trust, repeat business, and a healthier marketplace.')}</p>
              </div>
            </div>
            <div className="seller-guide-two-column">
              <div><h3>{localize('Do')}</h3><ul><li>{localize('Meet the delivery or service timeframe you communicate.')}</li><li>{localize('Respond to customer questions promptly and professionally.')}</li><li>{localize('Keep customers informed when an order or FINDit request changes.')}</li></ul></div>
              <div><h3>{localize('Avoid')}</h3><ul><li>{localize('Misleading product details, hidden conditions, or unavailable inventory.')}</li><li>{localize('Requesting payments outside rifKANDO for marketplace activity.')}</li><li>{localize('Using customer information for purposes unrelated to the transaction.')}</li></ul></div>
            </div>
          </section>

          <section id="conduct" className="seller-guide-section">
            <div className="seller-guide-section-heading">
              <span>05</span>
              <div>
                <h2>{localize('Marketplace conduct')}</h2>
                <p>{localize('rifKANDO does not allow illegal, counterfeit, harmful, discriminatory, adult, or copyright-infringing content and products.')}</p>
              </div>
            </div>
            <p className="seller-guide-section-copy">{localize('Listings or accounts that breach these standards may be reviewed, removed, restricted, or suspended. Serious or repeated violations can lead to account termination, subject to the Terms of Service and applicable law.')}</p>
          </section>

          <section className="seller-guide-support">
            <div>
              <h2>{localize('Need help setting up?')}</h2>
              <p>{localize('Our support team can help you choose the right seller workspace or understand your seller tools.')}</p>
            </div>
            <Link to="/contact">{localize('Contact support')} <ArrowRightIcon aria-hidden="true" /></Link>
          </section>
        </div>
      </div>

      <style>{`
        .seller-guide-page { background: #f7fafc; color: var(--color-brand-ink); min-height: calc(100vh - 80px); padding-bottom: 5rem; }
        .seller-guide-hero { background: linear-gradient(125deg, #07182f, var(--color-brand-ink) 58%, #164a78 145%); color: #fff; isolation: isolate; overflow: hidden; position: relative; }
        .seller-guide-hero::after { background: radial-gradient(circle, rgba(99,184,243,.28), transparent 68%); content: ''; height: 34rem; pointer-events: none; position: absolute; right: -12rem; top: -18rem; width: 34rem; z-index: -1; }
        .seller-guide-hero-grid { align-items: center; display: grid; gap: clamp(2rem, 6vw, 6rem); grid-template-columns: minmax(0, 1.3fr) minmax(15rem, .7fr); padding: clamp(4rem, 8vw, 6.5rem) 0; }
        .seller-guide-eyebrow { align-items: center; color: #c9e9ff; display: flex; font-size: .76rem; font-weight: 800; gap: .5rem; letter-spacing: .1em; margin: 0 0 1rem; text-transform: uppercase; }
        .seller-guide-eyebrow svg { height: 1.15rem; width: 1.15rem; }
        .seller-guide-hero h1 { color: #fff; font-size: clamp(2.35rem, 5vw, 4.2rem); letter-spacing: -.055em; line-height: 1.04; margin: 0; max-width: 45rem; }
        .seller-guide-intro { color: #e5f4ff; font-size: 1.08rem; line-height: 1.75; margin: 1.25rem 0 0; max-width: 40rem; }
        .seller-guide-actions { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: 1.8rem; }
        .seller-guide-primary-action, .seller-guide-secondary-action { align-items: center; border-radius: .72rem; display: inline-flex; font-weight: 800; gap: .5rem; min-height: 2.9rem; padding: .72rem 1rem; text-decoration: none; }
        .seller-guide-primary-action { background: var(--color-brand-blue); color: var(--color-brand-ink); }
        .seller-guide-primary-action svg, .seller-guide-support a svg { height: 1rem; width: 1rem; }
        .seller-guide-secondary-action { border: 1px solid rgba(255,255,255,.32); color: #fff; }
        .seller-guide-hero-card { background: linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.07)); border: 1px solid rgba(201,233,255,.3); border-radius: 1.1rem; box-shadow: 0 20px 46px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.16); padding: 1.5rem; }
        .seller-guide-hero-card > span { color: #c9e9ff; font-size: .75rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
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
