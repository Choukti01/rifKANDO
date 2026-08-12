import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: { common: { search: 'Search products, courses, services...', profile: 'My Profile', dashboard: 'Seller Dashboard', login: 'Continue with Google', logout: 'Logout', loading: 'Loading...', backToTop: 'Back to top ↑', allRightsReserved: 'All rights reserved.' }, nav: { products: 'Products', courses: 'Courses', services: 'Services', digital: 'Digital', bookings: 'Bookings', favorites: 'Favorites', cart: 'Cart', menu: 'Menu' }, footer: { kicker: 'ONE PLACE. MANY POSSIBILITIES.', description: "Morocco's first multi-service platform. Buy products, take courses, hire professionals, all in one place.", marketplace: 'Marketplace', sellers: 'For Sellers', support: 'Support', startSelling: 'Start Selling', sellerGuidelines: 'Seller Guidelines', pricing: 'Pricing', helpCenter: 'Help Center', contactUs: 'Contact Us', terms: 'Terms of Service', privacy: 'Privacy Policy', shop: 'Shop', learn: 'Learn', hire: 'Hire', book: 'Book' }, home: { welcome: 'Welcome to', description: "Morocco's first multi-service platform. Shop products, take courses, hire professionals, all in one place.", startShopping: 'Start Shopping', becomeSeller: 'Become a Seller', explore: 'Explore', categories: 'Categories', featured: 'Featured Items', viewAll: 'View All', ready: 'Ready to start selling?', join: 'Join thousands of sellers on rifKANDO' } } },
  fr: { translation: { common: { search: 'Rechercher des produits, cours, services...', profile: 'Mon profil', dashboard: 'Tableau de bord vendeur', login: 'Continuer avec Google', logout: 'Se déconnecter', loading: 'Chargement...', backToTop: 'Retour en haut ↑', allRightsReserved: 'Tous droits réservés.' }, nav: { products: 'Produits', courses: 'Cours', services: 'Services', digital: 'Numérique', bookings: 'Réservations', favorites: 'Favoris', cart: 'Panier', menu: 'Menu' }, footer: { kicker: 'UN SEUL ENDROIT. TANT DE POSSIBILITÉS.', description: "La première plateforme multiservices du Maroc. Achetez des produits, suivez des cours et engagez des professionnels, tout au même endroit.", marketplace: 'Place de marché', sellers: 'Pour les vendeurs', support: 'Assistance', startSelling: 'Commencer à vendre', sellerGuidelines: 'Guide du vendeur', pricing: 'Tarifs', helpCenter: "Centre d'aide", contactUs: 'Nous contacter', terms: "Conditions d'utilisation", privacy: 'Politique de confidentialité', shop: 'Acheter', learn: 'Apprendre', hire: 'Engager', book: 'Réserver' }, home: { welcome: 'Bienvenue sur', description: "La première plateforme multiservices du Maroc. Achetez des produits, suivez des cours et engagez des professionnels, tout au même endroit.", startShopping: 'Commencer mes achats', becomeSeller: 'Devenir vendeur', explore: 'Explorer', categories: 'Catégories', featured: 'Articles à la une', viewAll: 'Voir tout', ready: 'Prêt à commencer à vendre ?', join: 'Rejoignez des milliers de vendeurs sur rifKANDO' } } },
  ar: { translation: { common: { search: 'ابحث عن منتجات أو دورات أو خدمات...', profile: 'ملفي الشخصي', dashboard: 'لوحة تحكم البائع', login: 'المتابعة باستخدام Google', logout: 'تسجيل الخروج', loading: 'جارٍ التحميل...', backToTop: 'العودة إلى الأعلى ↑', allRightsReserved: 'جميع الحقوق محفوظة.' }, nav: { products: 'المنتجات', courses: 'الدورات', services: 'الخدمات', digital: 'المنتجات الرقمية', bookings: 'الحجوزات', favorites: 'المفضلة', cart: 'السلة', menu: 'القائمة' }, footer: { kicker: 'مكان واحد. إمكانيات كثيرة.', description: 'أول منصة متعددة الخدمات في المغرب. اشترِ المنتجات، وتعلم عبر الدورات، واستعن بالمحترفين، كل ذلك في مكان واحد.', marketplace: 'المتجر', sellers: 'للبائعين', support: 'الدعم', startSelling: 'ابدأ البيع', sellerGuidelines: 'دليل البائع', pricing: 'الأسعار', helpCenter: 'مركز المساعدة', contactUs: 'تواصل معنا', terms: 'شروط الاستخدام', privacy: 'سياسة الخصوصية', shop: 'تسوّق', learn: 'تعلّم', hire: 'اطلب خدمة', book: 'احجز' }, home: { welcome: 'مرحبًا بك في', description: 'أول منصة متعددة الخدمات في المغرب. اشترِ المنتجات، وتعلم عبر الدورات، واستعن بالمحترفين، كل ذلك في مكان واحد.', startShopping: 'ابدأ التسوق', becomeSeller: 'كن بائعًا', explore: 'استكشف', categories: 'الفئات', featured: 'عناصر مميزة', viewAll: 'عرض الكل', ready: 'هل أنت مستعد لبدء البيع؟', join: 'انضم إلى آلاف البائعين على rifKANDO' } } }
};

resources.en.translation.home.headline = 'Buy. Learn. Hire. Grow.';
resources.en.translation.home.headlineLead = 'Buy. Learn. Hire.';
resources.en.translation.home.headlineAccent = 'Grow.';
resources.en.translation.home.valueStatement = 'Quality products, practical courses, trusted professionals, digital tools, and bookings, connecting Morocco to the world.';
resources.fr.translation.home.headline = 'Achetez. Apprenez. Engagez. Progressez.';
resources.fr.translation.home.headlineLead = 'Achetez. Apprenez. Engagez.';
resources.fr.translation.home.headlineAccent = 'Progressez.';
resources.fr.translation.home.valueStatement = 'Des produits de qualité, des cours pratiques, des professionnels de confiance, des outils numériques et des réservations, le Maroc connecté au monde.';
resources.ar.translation.home.headline = 'اشترِ. تعلّم. اطلب خدمة. تقدّم.';
resources.ar.translation.home.headlineLead = 'اشترِ. تعلّم. اطلب خدمة.';
resources.ar.translation.home.headlineAccent = 'تقدّم.';
resources.ar.translation.home.valueStatement = 'منتجات موثوقة، ودورات عملية، ومحترفون موثوقون، وأدوات رقمية، وحجوزات، نربط المغرب بالعالم.';

Object.assign(resources.en.translation.footer, {
  sellers: 'Sell with rifKANDO',
  support: 'Support & Legal',
  startSelling: 'Become a Seller',
  sellerGuidelines: 'Seller Guide',
  pricing: 'Fees & Pricing',
  helpCenter: 'Help Center',
  contactUs: 'Contact Support',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
});

Object.assign(resources.fr.translation.footer, {
  sellers: 'Vendre avec rifKANDO',
  support: 'Assistance et informations juridiques',
  startSelling: 'Devenir vendeur',
  sellerGuidelines: 'Guide du vendeur',
  pricing: 'Frais et tarifs',
  helpCenter: "Centre d'aide",
  contactUs: "Contacter l'assistance",
  terms: "Conditions d'utilisation",
  privacy: 'Politique de confidentialit\u00e9',
});

Object.assign(resources.ar.translation.footer, {
  sellers: '\u0627\u0644\u0628\u064a\u0639 \u0645\u0639 rifKANDO',
  support: '\u0627\u0644\u062f\u0639\u0645 \u0648\u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629',
  startSelling: '\u0643\u0646 \u0628\u0627\u0626\u0639\u064b\u0627',
  sellerGuidelines: '\u062f\u0644\u064a\u0644 \u0627\u0644\u0628\u0627\u0626\u0639',
  pricing: '\u0627\u0644\u0631\u0633\u0648\u0645 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631',
  helpCenter: '\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0629',
  contactUs: '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062f\u0639\u0645',
  terms: '\u0634\u0631\u0648\u0637 \u0627\u0644\u062e\u062f\u0645\u0629',
  privacy: '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629',
});

const supportedLanguages = ['en', 'fr', 'ar'];
const savedLanguage = localStorage.getItem('rifkando_language');
const initialLanguage = supportedLanguages.includes(savedLanguage) ? savedLanguage : 'en';

i18n.use(initReactI18next).init({ resources, lng: initialLanguage, fallbackLng: 'en', interpolation: { escapeValue: false }, react: { useSuspense: false } });

const applyDocumentLanguage = (language) => {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
};

applyDocumentLanguage(initialLanguage);
i18n.on('languageChanged', (language) => {
  localStorage.setItem('rifkando_language', language);
  applyDocumentLanguage(language);
});

export default i18n;
