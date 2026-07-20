import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: { common: { search: 'Search products, courses, services...', profile: 'My Profile', dashboard: 'Seller Dashboard', login: 'Continue with Google', logout: 'Logout', loading: 'Loading...', backToTop: 'Back to top ↑', allRightsReserved: 'All rights reserved.' }, nav: { products: 'Products', courses: 'Courses', services: 'Services', digital: 'Digital', bookings: 'Bookings', favorites: 'Favorites', cart: 'Cart', menu: 'Menu' }, footer: { kicker: 'ONE PLACE. MANY POSSIBILITIES.', description: "Morocco's first multi-service platform. Buy products, take courses, hire professionals, all in one place.", marketplace: 'Marketplace', sellers: 'For Sellers', support: 'Support', startSelling: 'Start Selling', sellerGuidelines: 'Seller Guidelines', pricing: 'Pricing', helpCenter: 'Help Center', contactUs: 'Contact Us', terms: 'Terms of Service', privacy: 'Privacy Policy', shop: 'Shop', learn: 'Learn', hire: 'Hire', book: 'Book' }, home: { welcome: 'Welcome to', description: "Morocco's first multi-service platform. Shop products, take courses, hire professionals, all in one place.", startShopping: 'Start Shopping', becomeSeller: 'Become a Seller', explore: 'Explore', categories: 'Categories', featured: 'Featured Items', viewAll: 'View All', ready: 'Ready to start selling?', join: 'Join thousands of sellers on rifKANDO' } } },
  fr: { translation: { common: { search: 'Rechercher des produits, cours, services...', profile: 'Mon profil', dashboard: 'Tableau de bord vendeur', login: 'Continuer avec Google', logout: 'Se déconnecter', loading: 'Chargement...', backToTop: 'Retour en haut ↑', allRightsReserved: 'Tous droits réservés.' }, nav: { products: 'Produits', courses: 'Cours', services: 'Services', digital: 'Numérique', bookings: 'Réservations', favorites: 'Favoris', cart: 'Panier', menu: 'Menu' }, footer: { kicker: 'UN SEUL ENDROIT. TANT DE POSSIBILITÉS.', description: "La première plateforme multiservices du Maroc. Achetez des produits, suivez des cours et engagez des professionnels, tout au même endroit.", marketplace: 'Place de marché', sellers: 'Pour les vendeurs', support: 'Assistance', startSelling: 'Commencer à vendre', sellerGuidelines: 'Guide du vendeur', pricing: 'Tarifs', helpCenter: "Centre d'aide", contactUs: 'Nous contacter', terms: "Conditions d'utilisation", privacy: 'Politique de confidentialité', shop: 'Acheter', learn: 'Apprendre', hire: 'Engager', book: 'Réserver' }, home: { welcome: 'Bienvenue sur', description: "La première plateforme multiservices du Maroc. Achetez des produits, suivez des cours et engagez des professionnels, tout au même endroit.", startShopping: 'Commencer mes achats', becomeSeller: 'Devenir vendeur', explore: 'Explorer', categories: 'Catégories', featured: 'Articles à la une', viewAll: 'Voir tout', ready: 'Prêt à commencer à vendre ?', join: 'Rejoignez des milliers de vendeurs sur rifKANDO' } } },
  ar: { translation: { common: { search: 'ابحث عن منتجات أو دورات أو خدمات...', profile: 'ملفي الشخصي', dashboard: 'لوحة تحكم البائع', login: 'المتابعة باستخدام Google', logout: 'تسجيل الخروج', loading: 'جارٍ التحميل...', backToTop: 'العودة إلى الأعلى ↑', allRightsReserved: 'جميع الحقوق محفوظة.' }, nav: { products: 'المنتجات', courses: 'الدورات', services: 'الخدمات', digital: 'المنتجات الرقمية', bookings: 'الحجوزات', favorites: 'المفضلة', cart: 'السلة', menu: 'القائمة' }, footer: { kicker: 'مكان واحد. إمكانيات كثيرة.', description: 'أول منصة متعددة الخدمات في المغرب. اشترِ المنتجات، وتعلم عبر الدورات، واستعن بالمحترفين، كل ذلك في مكان واحد.', marketplace: 'المتجر', sellers: 'للبائعين', support: 'الدعم', startSelling: 'ابدأ البيع', sellerGuidelines: 'دليل البائع', pricing: 'الأسعار', helpCenter: 'مركز المساعدة', contactUs: 'تواصل معنا', terms: 'شروط الاستخدام', privacy: 'سياسة الخصوصية', shop: 'تسوّق', learn: 'تعلّم', hire: 'اطلب خدمة', book: 'احجز' }, home: { welcome: 'مرحبًا بك في', description: 'أول منصة متعددة الخدمات في المغرب. اشترِ المنتجات، وتعلم عبر الدورات، واستعن بالمحترفين، كل ذلك في مكان واحد.', startShopping: 'ابدأ التسوق', becomeSeller: 'كن بائعًا', explore: 'استكشف', categories: 'الفئات', featured: 'عناصر مميزة', viewAll: 'عرض الكل', ready: 'هل أنت مستعد لبدء البيع؟', join: 'انضم إلى آلاف البائعين على rifKANDO' } } }
};

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
