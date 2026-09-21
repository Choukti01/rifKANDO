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
resources.en.translation.nav.findit = 'FINDit';
delete resources.en.translation.nav.bookings;
resources.fr.translation.nav.findit = 'FINDit';
delete resources.fr.translation.nav.bookings;
resources.ar.translation.nav.findit = 'FINDit';
delete resources.ar.translation.nav.bookings;
resources.en.translation.home.valueStatement = 'Quality products, practical courses, trusted professionals, digital tools, and FINDit requests, connecting Morocco to the world.';
resources.fr.translation.home.headline = 'Achetez. Apprenez. Engagez. Progressez.';
resources.fr.translation.home.headlineLead = 'Achetez. Apprenez. Engagez.';
resources.fr.translation.home.headlineAccent = 'Progressez.';
resources.fr.translation.home.valueStatement = 'Des produits de qualité, des cours pratiques, des professionnels de confiance, des outils numériques et des réservations, le Maroc connecté au monde.';
resources.ar.translation.home.headline = 'اشترِ. تعلّم. اطلب خدمة. تقدّم.';
resources.ar.translation.home.headlineLead = 'اشترِ. تعلّم. اطلب خدمة.';
resources.ar.translation.home.headlineAccent = 'تقدّم.';
resources.ar.translation.home.valueStatement = 'منتجات موثوقة، ودورات عملية، ومحترفون موثوقون، وأدوات رقمية، وحجوزات، نربط المغرب بالعالم.';

Object.assign(resources.en.translation.footer, {
  kicker: 'FROM MOROCCO TO THE WORLD.',
  description: 'One platform for products, courses, professional services, digital tools, and FINDit requests.',
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
  kicker: '\u0645\u0646 \u0627\u0644\u0645\u063a\u0631\u0628 \u0625\u0644\u0649 \u0627\u0644\u0639\u0627\u0644\u0645.',
  description: '\u0645\u0646\u0635\u0629 \u0648\u0627\u062d\u062f\u0629 \u0644\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0648\u0627\u0644\u062f\u0648\u0631\u0627\u062a \u0648\u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0645\u0647\u0646\u064a\u0629 \u0648\u0627\u0644\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0631\u0642\u0645\u064a\u0629 \u0648\u0637\u0644\u0628\u0627\u062a FINDit.',
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

Object.assign(resources.en.translation, {
  findit: {
    navigation: 'FINDit',
    public: {
      eyebrow: 'FINDit',
      title: 'Need something specific?',
      lead: 'Describe what you are looking for once. Sellers send matching solutions privately, and you choose the one that works for you.',
      postRequest: 'Post a request',
      signInToPost: 'Sign in to post',
      viewBuyerRequests: 'View buyer requests',
      processTitle: 'Built for real requests',
      processText: 'FINDit is separate from the product catalogue. It is for items buyers cannot easily find.',
      processOne: 'Sellers send exact solutions',
      processTwo: 'You compare offers privately',
      processThree: 'Pay only by cash on delivery',
      openRequests: 'Open buyer requests',
      requestsHeading: 'Requests sellers can solve now',
      requestsDescription: 'Each request is independent from Products and only shows the details needed to make an offer.',
      dashboard: 'My FINDit dashboard',
      loading: 'Loading FINDit requests...',
      emptyTitle: 'No open requests yet',
      emptyText: 'Be the first to post what you need. Sellers will respond with solutions in your FINDit dashboard.',
      createRequest: 'Create a request',
      expires: 'Expires {{date}}',
      offer_one: '{{count}} offer',
      offer_other: '{{count}} offers',
      anyCondition: 'Any condition',
      preferredCondition: '{{condition}} preferred',
      sendSolution: 'Send solution',
      budgetOpen: 'Budget open',
      budgetUpTo: 'Up to {{amount}}',
      loadMore: 'Load more requests',
      loadingMore: 'Loading more requests...',
      loadMoreError: 'Unable to load more FINDit requests. Please try again.',
    },
    form: {
      eyebrow: 'FINDit request',
      title: 'Tell sellers exactly what you need.',
      description: 'Photos are optional, but they help sellers match the right item.',
      titleLabel: 'What are you looking for?',
      titlePlaceholder: 'Example: Front headlight for a 2016 Dacia Logan',
      detailsLabel: 'Details that help sellers match it',
      detailsPlaceholder: 'Brand, model, reference number, size, color, or compatibility details.',
      category: 'Category',
      city: 'Delivery city',
      cityPlaceholder: 'Example: Tangier',
      condition: 'Condition',
      budget: 'Maximum budget in MAD',
      duration: 'Keep request open for',
      photos: 'Reference photos',
      photosHelp: 'Up to 3 JPEG, PNG, or WebP photos. Do not upload identity documents.',
      addPhotos: 'Add photos',
      uploading: 'Uploading...',
      footer: 'Seller offers stay inside rifKANDO. You choose one and pay by cash on delivery.',
      publish: 'Publish FINDit request',
      publishing: 'Publishing...',
      validBudget: 'Enter a valid maximum budget. Use 0 if you want offers without a budget limit.',
      validDuration: 'Choose how long your request should stay open.',
      created: 'Your FINDit request is live. Sellers can now send solutions.',
      uploadError: 'Unable to upload this reference photo.',
      categories: {
        auto: 'Auto & Parts', electronics: 'Phones & Electronics', home: 'Home & Appliances',
        tools: 'Tools & Equipment', fashion: 'Fashion & Accessories', other: 'Other',
      },
      conditions: { any: 'Any condition', new: 'New only', used: 'Used is okay' },
      days: '{{count}} days',
    },
    buyer: {
      eyebrow: 'My FINDit dashboard',
      title: 'Ask once. Compare the right solutions.',
      lead: 'Your requests are separate from the product catalogue. Seller solutions, pricing, and COD checkout stay here.',
      active_one: '{{count}} active request',
      active_other: '{{count}} active requests',
      requests: 'Your requests',
      solutionsHeading: 'Seller solutions arrive here',
      privateOffers: 'Only you can see offers made for your request.',
      loading: 'Loading your FINDit workspace...',
      emptyTitle: 'No requests yet',
      emptyText: 'Publish your first request above. Sellers will send private, comparable solutions here.',
      cancel: 'Cancel request',
      cancelConfirm: 'Cancel this FINDit request? Active seller offers will be closed.',
      cancelled: 'FINDit request cancelled.',
      openBudget: 'Open budget',
      budgetUpTo: 'Budget up to {{amount}}',
      solution_one: '{{count}} seller solution',
      solution_other: '{{count}} seller solutions',
      noSolutions: 'Your request is live. Sellers will appear here with a solution, exact item price, delivery fee, and estimate.',
      item: 'Item', delivery: 'Delivery', arrival: 'Arrival', condition: 'Condition',
      included: 'Included', totalCod: 'Total COD: {{amount}}', choose: 'Choose this solution',
      checkoutEyebrow: 'Confirm FINDit solution', checkoutTotal: 'Cash on delivery total',
      fullName: 'Full name', email: 'Email', phone: 'Phone number', address: 'Delivery address', city: 'City', postalCode: 'Postal code (optional)',
      notes: 'Note for seller or delivery', notesPlaceholder: 'Optional delivery note',
      codNotice: 'Pay the quoted total only when the order is delivered. rifKANDO keeps the seller commission at 5% after COD settlement.',
      confirm: 'Confirm COD order', creating: 'Creating COD order...', created: 'FINDit offer accepted. Your COD order is ready.',
    },
    seller: {
      eyebrow: 'FINDit seller workspace',
      title: 'Answer real buyer needs with a precise solution.',
      lead: 'Offer an exact item, clear delivery total, and realistic arrival time. FINDit orders use a 5% rifKANDO commission after COD settlement.',
      independent: 'Independent from Products',
      independentText: 'Your FINDit solution is visible only to the buyer who asked. It is never published in the product catalogue.',
      requests: 'Buyer requests', heading: 'Open needs you can solve', open: '{{count}} open', loading: 'Loading buyer requests...',
      emptyTitle: 'No open FINDit requests', emptyText: 'New requests will appear here when buyers need a specific item.',
      anyCondition: 'Any condition', requestedCondition: '{{condition}} requested', budgetOpen: 'Budget open', budgetUpTo: 'Up to {{amount}}',
      send: 'Send solution', yourSolution: 'Your solution: {{status}}',
      solutions: 'Your solutions', status: 'Offer status', noSolutions: 'When you answer a buyer request, its status appears here.',
      reply: 'Reply to FINDit request', formNote: 'Give the buyer a specific, truthful solution. Contact and payment stay inside rifKANDO.',
      solutionTitle: 'Solution title', solutionDescription: 'Why this is the right match', price: 'Item price in MAD', deliveryFee: 'Delivery fee in MAD', deliveryIncluded: '0 if included', estimate: 'Delivery estimate',
      commission: 'rifKANDO takes 5% of the item price only after this FINDit COD order is delivered and settled.',
      sending: 'Sending solution...', sent: 'Send FINDit solution', withdraw: 'Withdraw', withdrawConfirm: 'Withdraw this FINDit solution? The buyer will no longer be able to accept it.', withdrawn: 'FINDit solution withdrawn.',
    },
  },
});

Object.assign(resources.ar.translation, {
  findit: {
    navigation: 'FINDit',
    public: {
      eyebrow: 'FINDit',
      title: '\u0647\u0644 \u062a\u0628\u062d\u062b \u0639\u0646 \u0634\u064a\u0621 \u0645\u062d\u062f\u062f\u061f',
      lead: '\u0635\u0650\u0641 \u0645\u0627 \u062a\u0628\u062d\u062b \u0639\u0646\u0647 \u0645\u0631\u0629 \u0648\u0627\u062d\u062f\u0629. \u064a\u0631\u0633\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646 \u062d\u0644\u0648\u0644\u0627\u064b \u0645\u0646\u0627\u0633\u0628\u0629 \u0628\u0634\u0643\u0644 \u062e\u0627\u0635\u060c \u0648\u062a\u062e\u062a\u0627\u0631 \u0627\u0644\u062e\u064a\u0627\u0631 \u0627\u0644\u0623\u0646\u0633\u0628 \u0644\u0643.',
      postRequest: '\u0623\u0636\u0641 \u0637\u0644\u0628\u064b\u0627', signInToPost: '\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0625\u0636\u0627\u0641\u0629 \u0637\u0644\u0628', viewBuyerRequests: '\u0639\u0631\u0636 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0646',
      processTitle: '\u0645\u0635\u0645\u0645 \u0644\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0641\u0639\u0644\u064a\u0629', processText: 'FINDit \u0645\u0633\u0627\u062d\u0629 \u0645\u0633\u062a\u0642\u0644\u0629 \u0639\u0646 \u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0644\u0644\u0623\u0634\u064a\u0627\u0621 \u0635\u0639\u0628\u0629 \u0627\u0644\u0639\u062b\u0648\u0631.',
      processOne: '\u064a\u0631\u0633\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646 \u062d\u0644\u0648\u0644\u0627\u064b \u062f\u0642\u064a\u0642\u0629', processTwo: '\u062a\u0642\u0627\u0631\u0646 \u0627\u0644\u0639\u0631\u0648\u0636 \u0628\u0634\u0643\u0644 \u062e\u0627\u0635', processThree: '\u0627\u062f\u0641\u0639 \u0641\u0642\u0637 \u0639\u0646\u062f \u0627\u0644\u062a\u0633\u0644\u0651\u0645',
      openRequests: '\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0646 \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629', requestsHeading: '\u0637\u0644\u0628\u0627\u062a \u064a\u0645\u0643\u0646 \u0644\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u062d\u0644\u0647\u0627 \u0627\u0644\u0622\u0646', requestsDescription: '\u0643\u0644 \u0637\u0644\u0628 \u0645\u0633\u062a\u0642\u0644 \u0639\u0646 \u0642\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0648\u064a\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0636\u0631\u0648\u0631\u064a\u0629 \u0641\u0642\u0637.', dashboard: '\u0644\u0648\u062d\u0629 FINDit \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u064a', loading: '\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0637\u0644\u0628\u0627\u062a FINDit...', emptyTitle: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u0627\u062a \u0645\u0641\u062a\u0648\u062d\u0629 \u062d\u0627\u0644\u064a\u064b\u0627', emptyText: '\u0643\u0646 \u0623\u0648\u0644 \u0645\u0646 \u064a\u0646\u0634\u0631 \u0645\u0627 \u064a\u062d\u062a\u0627\u062c\u0647.', createRequest: '\u0623\u0646\u0634\u0626 \u0637\u0644\u0628\u064b\u0627', expires: '\u064a\u0646\u062a\u0647\u064a \u0641\u064a {{date}}', offer_one: '{{count}} \u0639\u0631\u0636', offer_other: '{{count}} \u0639\u0631\u0648\u0636', anyCondition: '\u0623\u064a \u062d\u0627\u0644\u0629', preferredCondition: '\u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0641\u0636\u0644\u0629: {{condition}}', sendSolution: '\u0623\u0631\u0633\u0644 \u062d\u0644\u064b\u0627', budgetOpen: '\u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0645\u0641\u062a\u0648\u062d\u0629', budgetUpTo: '\u062d\u062a\u0649 {{amount}}', loadMore: '\u062a\u062d\u0645\u064a\u0644 \u0645\u0632\u064a\u062f \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062a', loadingMore: '\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0645\u0632\u064a\u062f \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062a...', loadMoreError: '\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0632\u064a\u062f \u0645\u0646 \u0637\u0644\u0628\u0627\u062a FINDit. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
    },
    form: {
      eyebrow: '\u0637\u0644\u0628 FINDit', title: '\u0623\u062e\u0628\u0631 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u0628\u062f\u0642\u0629 \u0639\u0645\u0651\u0627 \u062a\u062d\u062a\u0627\u062c\u0647.', description: '\u0627\u0644\u0635\u0648\u0631 \u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629 \u0648\u0644\u0643\u0646\u0647\u0627 \u062a\u0633\u0627\u0639\u062f \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u0639\u0644\u0649 \u0625\u064a\u062c\u0627\u062f \u0627\u0644\u0639\u0646\u0635\u0631 \u0627\u0644\u0645\u0646\u0627\u0633\u0628.', titleLabel: '\u0645\u0627\u0630\u0627 \u062a\u0628\u062d\u062b \u0639\u0646\u061f', titlePlaceholder: '\u0645\u062b\u0627\u0644: \u0645\u0635\u0628\u0627\u062d \u0623\u0645\u0627\u0645\u064a \u0644\u0633\u064a\u0627\u0631\u0629 \u062f\u0627\u0633\u064a\u0627 \u0644\u0648\u063a\u0627\u0646 2016', detailsLabel: '\u062a\u0641\u0627\u0635\u064a\u0644 \u062a\u0633\u0627\u0639\u062f \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u0639\u0644\u0649 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629', detailsPlaceholder: '\u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0623\u0648 \u0627\u0644\u0637\u0631\u0627\u0632 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062c\u0639 \u0623\u0648 \u0627\u0644\u0645\u0642\u0627\u0633 \u0623\u0648 \u0627\u0644\u0644\u0648\u0646.', category: '\u0627\u0644\u0641\u0626\u0629', city: '\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644', cityPlaceholder: '\u0645\u062b\u0627\u0644: \u0637\u0646\u062c\u0629', condition: '\u0627\u0644\u062d\u0627\u0644\u0629', budget: '\u0623\u0642\u0635\u0649 \u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0628\u0627\u0644\u062f\u0631\u0647\u0645', duration: '\u0627\u062a\u0631\u0643 \u0627\u0644\u0637\u0644\u0628 \u0645\u0641\u062a\u0648\u062d\u064b\u0627 \u0644\u0645\u062f\u0629', photos: '\u0635\u0648\u0631 \u0645\u0631\u062c\u0639\u064a\u0629', photosHelp: '\u062d\u062f \u0623\u0642\u0635\u0649 3 \u0635\u0648\u0631 JPEG \u0623\u0648 PNG \u0623\u0648 WebP. \u0644\u0627 \u062a\u0631\u0641\u0639 \u0648\u062b\u0627\u0626\u0642 \u0627\u0644\u0647\u0648\u064a\u0629.', addPhotos: '\u0623\u0636\u0641 \u0635\u0648\u0631\u064b\u0627', uploading: '\u062c\u0627\u0631\u064d \u0627\u0644\u0631\u0641\u0639...', footer: '\u062a\u0628\u0642\u0649 \u0639\u0631\u0648\u0636 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u062f\u0627\u062e\u0644 rifKANDO. \u062a\u062e\u062a\u0627\u0631 \u0627\u0644\u0639\u0631\u0636 \u0648\u062a\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u062a\u0633\u0644\u0651\u0645.', publish: '\u0627\u0646\u0634\u0631 \u0637\u0644\u0628 FINDit', publishing: '\u062c\u0627\u0631\u064d \u0627\u0644\u0646\u0634\u0631...', validBudget: '\u0623\u062f\u062e\u0644 \u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0635\u062d\u064a\u062d\u0629. \u0627\u0633\u062a\u062e\u062f\u0645 0 \u0644\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629.', validDuration: '\u0627\u062e\u062a\u0631 \u0645\u062f\u0629 \u0628\u0642\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0645\u0641\u062a\u0648\u062d\u064b\u0627.', created: '\u0623\u0635\u0628\u062d \u0637\u0644\u0628 FINDit \u0645\u062a\u0627\u062d\u064b\u0627. \u064a\u0645\u0643\u0646 \u0644\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062d\u0644\u0648\u0644 \u0627\u0644\u0622\u0646.', uploadError: '\u062a\u0639\u0630\u0631 \u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u062c\u0639.', categories: { auto: '\u0633\u064a\u0627\u0631\u0627\u062a \u0648\u0642\u0637\u0639 \u063a\u064a\u0627\u0631', electronics: '\u0647\u0648\u0627\u062a\u0641 \u0648\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0627\u062a', home: '\u0627\u0644\u0645\u0646\u0632\u0644 \u0648\u0627\u0644\u0623\u062c\u0647\u0632\u0629', tools: '\u0623\u062f\u0648\u0627\u062a \u0648\u0645\u0639\u062f\u0627\u062a', fashion: '\u0623\u0632\u064a\u0627\u0621 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062a', other: '\u0623\u062e\u0631\u0649' }, conditions: { any: '\u0623\u064a \u062d\u0627\u0644\u0629', new: '\u062c\u062f\u064a\u062f \u0641\u0642\u0637', used: '\u0627\u0644\u0645\u0633\u062a\u0639\u0645\u0644 \u0645\u0642\u0628\u0648\u0644' }, days: '{{count}} \u0623\u064a\u0627\u0645',
    },
  },
});

Object.assign(resources.en.translation.common, {
  sellerDashboard: 'Seller dashboard',
  myOrders: 'My orders',
  myFinditRequests: 'My FINDit requests',
  savedItems: 'Saved items',
  becomeSeller: 'Become a seller',
  closeMenu: 'Close navigation menu',
  openMenu: 'Open navigation menu',
  accountMenu: 'Account menu',
  languageSelector: 'Language selector',
  english: 'English',
  french: 'French',
  arabic: 'Arabic',
});

Object.assign(resources.ar.translation.common, {
  search: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c\u0627\u062a \u0623\u0648 \u062f\u0648\u0631\u0627\u062a \u0623\u0648 \u062e\u062f\u0645\u0627\u062a...',
  profile: '\u0645\u0644\u0641\u064a \u0627\u0644\u0634\u062e\u0635\u064a',
  dashboard: '\u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0627\u0644\u0628\u0627\u0626\u0639',
  sellerDashboard: '\u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0627\u0644\u0628\u0627\u0626\u0639',
  myOrders: '\u0637\u0644\u0628\u0627\u062a\u064a',
  myFinditRequests: '\u0637\u0644\u0628\u0627\u062a FINDit \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u064a',
  savedItems: '\u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629',
  becomeSeller: '\u0643\u0646 \u0628\u0627\u0626\u0639\u064b\u0627',
  login: '\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Google',
  logout: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c',
  loading: '\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0645\u064a\u0644...',
  backToTop: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0623\u0639\u0644\u0649',
  allRightsReserved: '\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629.',
  closeMenu: '\u0625\u063a\u0644\u0627\u0642 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062a\u0646\u0642\u0644',
  openMenu: '\u0641\u062a\u062d \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062a\u0646\u0642\u0644',
  accountMenu: '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062d\u0633\u0627\u0628',
  languageSelector: '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0644\u063a\u0629',
  english: '\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629',
  french: '\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629',
  arabic: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
});

Object.assign(resources.ar.translation.nav, {
  products: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
  courses: '\u0627\u0644\u062f\u0648\u0631\u0627\u062a',
  services: '\u0627\u0644\u062e\u062f\u0645\u0627\u062a',
  digital: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0631\u0642\u0645\u064a\u0629',
  favorites: '\u0627\u0644\u0645\u0641\u0636\u0644\u0629',
  cart: '\u0627\u0644\u0633\u0644\u0629',
  menu: '\u0627\u0644\u0642\u0627\u0626\u0645\u0629',
});

Object.assign(resources.ar.translation.home, {
  headline: '\u0627\u0634\u062a\u0631\u0650. \u062a\u0639\u0644\u0651\u0645. \u0627\u0637\u0644\u0628 \u062e\u062f\u0645\u0629. \u062a\u0642\u062f\u0651\u0645.',
  headlineLead: '\u0627\u0634\u062a\u0631\u0650. \u062a\u0639\u0644\u0651\u0645. \u0627\u0637\u0644\u0628 \u062e\u062f\u0645\u0629.',
  headlineAccent: '\u062a\u0642\u062f\u0651\u0645.',
  valueStatement: '\u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0648\u062b\u0648\u0642\u0629\u060c \u0648\u062f\u0648\u0631\u0627\u062a \u0639\u0645\u0644\u064a\u0629\u060c \u0648\u0645\u062d\u062a\u0631\u0641\u0648\u0646 \u0645\u0648\u062b\u0648\u0642\u0648\u0646\u060c \u0648\u0623\u062f\u0648\u0627\u062a \u0631\u0642\u0645\u064a\u0629\u060c \u0648\u0637\u0644\u0628\u0627\u062a FINDit\u060c \u0646\u0631\u0628\u0637 \u0627\u0644\u0645\u063a\u0631\u0628 \u0628\u0627\u0644\u0639\u0627\u0644\u0645.',
});

Object.assign(resources.ar.translation.findit, {
  form: {
    ...resources.ar.translation.findit.form,
    photoLimit: '\u064a\u0645\u0643\u0646\u0643 \u0625\u0636\u0627\u0641\u0629 \u0645\u0627 \u064a\u0635\u0644 \u0625\u0644\u0649 3 \u0635\u0648\u0631 \u0645\u0631\u062c\u0639\u064a\u0629.',
    photoRequirements: '\u0627\u0633\u062a\u062e\u062f\u0645 \u0635\u0648\u0631 JPEG \u0623\u0648 PNG \u0623\u0648 WebP \u0628\u062d\u062c\u0645 \u064a\u0635\u0644 \u0625\u0644\u0649 5 \u0645\u064a\u063a\u0627\u0628\u0627\u064a\u062a \u0644\u0643\u0644 \u0635\u0648\u0631\u0629.',
    removePhoto: '\u0625\u0632\u0627\u0644\u0629 \u0635\u0648\u0631\u0629 \u0645\u0631\u062c\u0639\u064a\u0629',
  },
  buyer: {
    eyebrow: '\u0644\u0648\u062d\u0629 FINDit \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u064a', title: '\u0627\u0637\u0644\u0628 \u0645\u0631\u0629 \u0648\u0627\u062d\u062f\u0629. \u0648\u0642\u0627\u0631\u0646 \u0627\u0644\u062d\u0644\u0648\u0644 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629.',
    lead: '\u0637\u0644\u0628\u0627\u062a\u0643 \u0645\u0633\u062a\u0642\u0644\u0629 \u0639\u0646 \u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a. \u062a\u0628\u0642\u0649 \u062d\u0644\u0648\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0637\u0644\u0628 \u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0647\u0646\u0627.',
    active_one: '{{count}} \u0637\u0644\u0628 \u0646\u0634\u0637', active_other: '{{count}} \u0637\u0644\u0628\u0627\u062a \u0646\u0634\u0637\u0629', requests: '\u0637\u0644\u0628\u0627\u062a\u0643', solutionsHeading: '\u062a\u0635\u0644 \u062d\u0644\u0648\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u0647\u0646\u0627', privateOffers: '\u0623\u0646\u062a \u0641\u0642\u0637 \u062a\u0633\u062a\u0637\u064a\u0639 \u0631\u0624\u064a\u0629 \u0627\u0644\u0639\u0631\u0648\u0636 \u0627\u0644\u0645\u0642\u062f\u0645\u0629 \u0644\u0637\u0644\u0628\u0643.',
    loading: '\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0645\u0633\u0627\u062d\u0629 FINDit...', emptyTitle: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u0627\u062a \u0628\u0639\u062f', emptyText: '\u0627\u0646\u0634\u0631 \u0637\u0644\u0628\u0643 \u0627\u0644\u0623\u0648\u0644 \u0623\u0639\u0644\u0627\u0647. \u0633\u064a\u0631\u0633\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646 \u062d\u0644\u0648\u0644\u0627\u064b \u062e\u0627\u0635\u0629 \u064a\u0645\u0643\u0646\u0643 \u0645\u0642\u0627\u0631\u0646\u062a\u0647\u0627 \u0647\u0646\u0627.',
    cancel: '\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628', cancelConfirm: '\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0644\u063a\u0627\u0621 \u0637\u0644\u0628 FINDit \u0647\u0630\u0627\u061f \u0633\u064a\u062a\u0645 \u0625\u063a\u0644\u0627\u0642 \u0639\u0631\u0648\u0636 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u0627\u0644\u0646\u0634\u0637\u0629.', cancelled: '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0637\u0644\u0628 FINDit.', openBudget: '\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0645\u0641\u062a\u0648\u062d\u0629', budgetUpTo: '\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u062a\u0635\u0644 \u0625\u0644\u0649 {{amount}}',
    solution_one: '{{count}} \u062d\u0644 \u0645\u0646 \u0628\u0627\u0626\u0639', solution_other: '{{count}} \u062d\u0644\u0648\u0644 \u0645\u0646 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646', noSolutions: '\u0637\u0644\u0628\u0643 \u0645\u0646\u0634\u0648\u0631. \u0633\u064a\u0638\u0647\u0631 \u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646 \u0647\u0646\u0627 \u0645\u0639 \u062d\u0644 \u0648\u0633\u0639\u0631 \u0627\u0644\u0633\u0644\u0639\u0629 \u0648\u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0648\u0627\u0644\u0645\u062f\u0629 \u0627\u0644\u0645\u062a\u0648\u0642\u0639\u0629.',
    item: '\u0627\u0644\u0633\u0644\u0639\u0629', delivery: '\u0627\u0644\u062a\u0648\u0635\u064a\u0644', arrival: '\u0627\u0644\u0648\u0635\u0648\u0644', condition: '\u0627\u0644\u062d\u0627\u0644\u0629', included: '\u0645\u0634\u0645\u0648\u0644', totalCod: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645: {{amount}}', choose: '\u0627\u062e\u062a\u0631 \u0647\u0630\u0627 \u0627\u0644\u062d\u0644',
    checkoutEyebrow: '\u062a\u0623\u0643\u064a\u062f \u062d\u0644 FINDit', checkoutTotal: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645', fullName: '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644', email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', phone: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641', address: '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644', city: '\u0627\u0644\u0645\u062f\u064a\u0646\u0629', postalCode: '\u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0628\u0631\u064a\u062f\u064a (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)', notes: '\u0645\u0644\u0627\u062d\u0638\u0629 \u0644\u0644\u0628\u0627\u0626\u0639 \u0623\u0648 \u0627\u0644\u062a\u0648\u0635\u064a\u0644', notesPlaceholder: '\u0645\u0644\u0627\u062d\u0638\u0629 \u062a\u0648\u0635\u064a\u0644 \u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629', codNotice: '\u0627\u062f\u0641\u0639 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u062a\u0641\u0642 \u0639\u0644\u064a\u0647 \u0641\u0642\u0637 \u0639\u0646\u062f \u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0637\u0644\u0628. \u064a\u062d\u062a\u0641\u0638 rifKANDO \u0628\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0628\u0627\u0626\u0639 \u0628\u0646\u0633\u0628\u0629 5% \u0628\u0639\u062f \u062a\u0633\u0648\u064a\u0629 \u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645.', confirm: '\u062a\u0623\u0643\u064a\u062f \u0637\u0644\u0628 \u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645', creating: '\u062c\u0627\u0631\u064d \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0637\u0644\u0628...', created: '\u062a\u0645 \u0642\u0628\u0648\u0644 \u0639\u0631\u0636 FINDit. \u0637\u0644\u0628 \u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u062c\u0627\u0647\u0632.',
  },
  seller: {
    eyebrow: '\u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u0628\u0627\u0626\u0639 \u0641\u064a FINDit', title: '\u0623\u062c\u0628 \u0639\u0646 \u0627\u062d\u062a\u064a\u0627\u062c\u0627\u062a \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0646 \u0627\u0644\u062d\u0642\u064a\u0642\u064a\u0629 \u0628\u062d\u0644 \u062f\u0642\u064a\u0642.', lead: '\u0642\u062f\u0651\u0645 \u0633\u0644\u0639\u0629 \u0645\u062d\u062f\u062f\u0629 \u0648\u0625\u062c\u0645\u0627\u0644\u064a \u062a\u0648\u0635\u064a\u0644 \u0648\u0627\u0636\u062d \u0648\u0645\u0648\u0639\u062f \u0648\u0635\u0648\u0644 \u0648\u0627\u0642\u0639\u064a. \u062a\u064f\u0637\u0628\u0642 \u0639\u0645\u0648\u0644\u0629 rifKANDO \u0628\u0646\u0633\u0628\u0629 5% \u0628\u0639\u062f \u062a\u0633\u0648\u064a\u0629 \u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645.', independent: '\u0645\u0633\u062a\u0642\u0644 \u0639\u0646 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a', independentText: '\u064a\u0638\u0647\u0631 \u062d\u0644 FINDit \u0627\u0644\u062e\u0627\u0635 \u0628\u0643 \u0641\u0642\u0637 \u0644\u0644\u0645\u0634\u062a\u0631\u064a \u0627\u0644\u0630\u064a \u0637\u0644\u0628\u0647. \u0644\u0627 \u064a\u064f\u0646\u0634\u0631 \u0623\u0628\u062f\u064b\u0627 \u0641\u064a \u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a.', requests: '\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0646', heading: '\u0627\u062d\u062a\u064a\u0627\u062c\u0627\u062a \u0645\u0641\u062a\u0648\u062d\u0629 \u064a\u0645\u0643\u0646\u0643 \u062a\u0644\u0628\u064a\u062a\u0647\u0627', open: '{{count}} \u0645\u0641\u062a\u0648\u062d', loading: '\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0646...', emptyTitle: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u0627\u062a FINDit \u0645\u0641\u062a\u0648\u062d\u0629', emptyText: '\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0647\u0646\u0627 \u0639\u0646\u062f\u0645\u0627 \u064a\u062d\u062a\u0627\u062c \u0627\u0644\u0645\u0634\u062a\u0631\u0648\u0646 \u0625\u0644\u0649 \u0633\u0644\u0639\u0629 \u0645\u062d\u062f\u062f\u0629.', anyCondition: '\u0623\u064a \u062d\u0627\u0644\u0629', requestedCondition: '\u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629: {{condition}}', budgetOpen: '\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0645\u0641\u062a\u0648\u062d\u0629', budgetUpTo: '\u062d\u062a\u0649 {{amount}}', send: '\u0623\u0631\u0633\u0644 \u062d\u0644\u064b\u0627', yourSolution: '\u062d\u0644\u0643: {{status}}', solutions: '\u062d\u0644\u0648\u0644\u0643', status: '\u062d\u0627\u0644\u0629 \u0627\u0644\u0639\u0631\u0636', noSolutions: '\u0639\u0646\u062f\u0645\u0627 \u062a\u0631\u062f \u0639\u0644\u0649 \u0637\u0644\u0628 \u0645\u0634\u062a\u0631\u064d\u060c \u0633\u062a\u0638\u0647\u0631 \u062d\u0627\u0644\u0629 \u062d\u0644\u0643 \u0647\u0646\u0627.', reply: '\u0627\u0644\u0631\u062f \u0639\u0644\u0649 \u0637\u0644\u0628 FINDit', formNote: '\u0642\u062f\u0651\u0645 \u062d\u0644\u064b\u0627 \u0645\u062d\u062f\u062f\u064b\u0627 \u0648\u0635\u0627\u062f\u0642\u064b\u0627. \u064a\u0628\u0642\u0649 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0648\u0627\u0644\u062f\u0641\u0639 \u062f\u0627\u062e\u0644 rifKANDO.', solutionTitle: '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062d\u0644', solutionDescription: '\u0644\u0645\u0627\u0630\u0627 \u0647\u0630\u0627 \u0647\u0648 \u0627\u0644\u062d\u0644 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u061f', price: '\u0633\u0639\u0631 \u0627\u0644\u0633\u0644\u0639\u0629 \u0628\u0627\u0644\u062f\u0631\u0647\u0645', deliveryFee: '\u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0628\u0627\u0644\u062f\u0631\u0647\u0645', deliveryIncluded: '0 \u0625\u0630\u0627 \u0643\u0627\u0646\u062a \u0645\u0634\u0645\u0648\u0644\u0629', estimate: '\u0645\u062f\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0627\u0644\u0645\u062a\u0648\u0642\u0639\u0629', commission: '\u064a\u0623\u062e\u0630 rifKANDO \u0646\u0633\u0628\u0629 5% \u0645\u0646 \u0633\u0639\u0631 \u0627\u0644\u0633\u0644\u0639\u0629 \u0641\u0642\u0637 \u0628\u0639\u062f \u062a\u0633\u0644\u064a\u0645 \u0637\u0644\u0628 FINDit \u0628\u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0648\u062a\u0633\u0648\u064a\u062a\u0647.', sending: '\u062c\u0627\u0631\u064d \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062d\u0644...', sent: '\u0623\u0631\u0633\u0644 \u062d\u0644 FINDit', withdraw: '\u0627\u0633\u062d\u0628 \u0627\u0644\u0639\u0631\u0636', withdrawConfirm: '\u0647\u0644 \u062a\u0631\u064a\u062f \u0633\u062d\u0628 \u062d\u0644 FINDit \u0647\u0630\u0627\u061f \u0644\u0646 \u064a\u062a\u0645\u0643\u0646 \u0627\u0644\u0645\u0634\u062a\u0631\u064a \u0645\u0646 \u0642\u0628\u0648\u0644\u0647 \u0628\u0639\u062f \u0627\u0644\u0622\u0646.', withdrawn: '\u062a\u0645 \u0633\u062d\u0628 \u062d\u0644 FINDit.',
  },
});

Object.assign(resources.en.translation.findit.form, {
  photoLimit: 'You can add up to 3 reference photos.',
  photoRequirements: 'Use JPEG, PNG, or WebP photos up to 5 MB each.',
  removePhoto: 'Remove reference photo',
});

Object.assign(resources.en.translation.findit, {
  status: { active: 'Active', accepted: 'Accepted', withdrawn: 'Withdrawn', cancelled: 'Cancelled', completed: 'Completed', pending: 'Pending', new: 'New', used: 'Used', refurbished: 'Refurbished' },
});

Object.assign(resources.ar.translation.findit, {
  status: { active: '\u0646\u0634\u0637', accepted: '\u0645\u0642\u0628\u0648\u0644', withdrawn: '\u0645\u0633\u062d\u0648\u0628', cancelled: '\u0645\u0644\u063a\u0649', completed: '\u0645\u0643\u062a\u0645\u0644', pending: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631', new: '\u062c\u062f\u064a\u062f', used: '\u0645\u0633\u062a\u0639\u0645\u0644', refurbished: '\u0645\u062c\u062f\u062f' },
});

Object.assign(resources.en.translation, {
  sellerDashboard: {
    title: 'Seller dashboard', overview: 'Overview', products: 'Products', courses: 'Courses', services: 'Services', digital: 'Digital', orders: 'Orders', findit: 'FINDit', offers: 'Offers', messages: 'Messages', wallet: 'Wallet', settings: 'Settings', buying: 'Buying', savedItems: 'Saved items', cart: 'Cart', exit: 'Exit dashboard', seller: 'Seller', productSeller: 'Product seller', courseInstructor: 'Course instructor', serviceProvider: 'Service provider', digitalCreator: 'Digital creator', collapse: 'Collapse sidebar', expand: 'Expand sidebar', close: 'Close dashboard menu', open: 'Open dashboard menu',
  },
});

Object.assign(resources.ar.translation, {
  sellerDashboard: {
    title: '\u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0627\u0644\u0628\u0627\u0626\u0639', overview: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629', products: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a', courses: '\u0627\u0644\u062f\u0648\u0631\u0627\u062a', services: '\u0627\u0644\u062e\u062f\u0645\u0627\u062a', digital: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0631\u0642\u0645\u064a\u0629', orders: '\u0627\u0644\u0637\u0644\u0628\u0627\u062a', findit: '\u0627\u0639\u062b\u0631 \u0639\u0644\u064a\u0647\u0627', offers: '\u0627\u0644\u0639\u0631\u0648\u0636', messages: '\u0627\u0644\u0631\u0633\u0627\u0626\u0644', wallet: '\u0627\u0644\u0645\u062d\u0641\u0638\u0629', settings: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a', buying: '\u0627\u0644\u0634\u0631\u0627\u0621', savedItems: '\u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629', cart: '\u0633\u0644\u0629 \u0627\u0644\u062a\u0633\u0648\u0642', exit: '\u062e\u0631\u0648\u062c \u0645\u0646 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645', seller: '\u0628\u0627\u0626\u0639', productSeller: '\u0628\u0627\u0626\u0639 \u0645\u0646\u062a\u062c\u0627\u062a', courseInstructor: '\u0645\u062f\u0631\u0633 \u062f\u0648\u0631\u0627\u062a', serviceProvider: '\u0645\u0642\u062f\u0645 \u062e\u062f\u0645\u0627\u062a', digitalCreator: '\u0645\u0646\u0634\u0626 \u0645\u0646\u062a\u062c\u0627\u062a \u0631\u0642\u0645\u064a\u0629', collapse: '\u0637\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062c\u0627\u0646\u0628\u064a\u0629', expand: '\u062a\u0648\u0633\u064a\u0639 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062c\u0627\u0646\u0628\u064a\u0629', close: '\u0625\u063a\u0644\u0627\u0642 \u0642\u0627\u0626\u0645\u0629 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645', open: '\u0641\u062a\u062d \u0642\u0627\u0626\u0645\u0629 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
  },
});

Object.assign(resources.en.translation, {
  auth: {
    account: 'rifKANDO account', enterCode: 'Enter your SMS code', welcomeBack: 'Welcome back', codeSent: 'Use the six-digit code sent to your phone.', signInLead: 'Sign in securely with your phone number or Google account.', smsCode: 'SMS code', signIn: 'Sign in', signingIn: 'Signing in...', newCode: 'Send a new code', differentPhone: 'Use a different phone number', mobile: 'Mobile number', phoneHint: 'Use your country code. Moroccan mobile numbers can also start with 0.', sendingSms: 'Sending SMS...', continuePhone: 'Continue with phone', or: 'or', newTo: 'New to rifKANDO?', create: 'Create an account', confirmPhone: 'Confirm your phone', join: 'Join rifKANDO', codeRegistration: 'Enter the six-digit code we sent by SMS.', createLead: 'Create your account with your phone number or Google account.', confirming: 'Confirming...', confirmCreate: 'Confirm and create account', changePhone: 'Change phone number', fullName: 'Full name', alreadyHave: 'Already have an account?', googleSignInFailed: 'Google sign-in was cancelled or failed.', googleSignUpFailed: 'Google sign-up was cancelled or failed.',
  },
});

Object.assign(resources.ar.translation, {
  auth: {
    account: '\u062d\u0633\u0627\u0628 rifKANDO', enterCode: '\u0623\u062f\u062e\u0644 \u0631\u0645\u0632 SMS', welcomeBack: '\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0639\u0648\u062f\u062a\u0643', codeSent: '\u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0631\u0645\u0632 \u0645\u0643\u0648\u0651\u0646\u064b\u0627 \u0645\u0646 \u0633\u062a\u0629 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0645\u0631\u0633\u0644 \u0625\u0644\u0649 \u0647\u0627\u062a\u0641\u0643.', signInLead: '\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0623\u0645\u0627\u0646 \u0628\u0631\u0642\u0645 \u0647\u0627\u062a\u0641\u0643 \u0623\u0648 \u062d\u0633\u0627\u0628 Google.', smsCode: '\u0631\u0645\u0632 SMS', signIn: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', signingIn: '\u062c\u0627\u0631\u064d \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644...', newCode: '\u0623\u0631\u0633\u0644 \u0631\u0645\u0632\u064b\u0627 \u062c\u062f\u064a\u062f\u064b\u0627', differentPhone: '\u0627\u0633\u062a\u062e\u062f\u0645 \u0631\u0642\u0645 \u0647\u0627\u062a\u0641 \u0622\u062e\u0631', mobile: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641', phoneHint: '\u0627\u0633\u062a\u062e\u062f\u0645 \u0631\u0645\u0632 \u0627\u0644\u062f\u0648\u0644\u0629. \u064a\u0645\u0643\u0646 \u0623\u064a\u0636\u064b\u0627 \u0623\u0646 \u062a\u0628\u062f\u0623 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0647\u0648\u0627\u062a\u0641 \u0627\u0644\u0645\u063a\u0631\u0628\u064a\u0629 \u0628\u0627\u0644\u0631\u0642\u0645 0.', sendingSms: '\u062c\u0627\u0631\u064d \u0625\u0631\u0633\u0627\u0644 SMS...', continuePhone: '\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0628\u0627\u0644\u0647\u0627\u062a\u0641', or: '\u0623\u0648', newTo: '\u062c\u062f\u064a\u062f \u0641\u064a rifKANDO\u061f', create: '\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u064b\u0627', confirmPhone: '\u0623\u0643\u0651\u062f \u0647\u0627\u062a\u0641\u0643', join: '\u0627\u0646\u0636\u0645 \u0625\u0644\u0649 rifKANDO', codeRegistration: '\u0623\u062f\u062e\u0644 \u0627\u0644\u0631\u0645\u0632 \u0645\u0643\u0648\u0651\u0646\u064b\u0627 \u0645\u0646 \u0633\u062a\u0629 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0645\u0631\u0633\u0644 \u0628\u0631\u0633\u0627\u0644\u0629 SMS.', createLead: '\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u0643 \u0628\u0631\u0642\u0645 \u0647\u0627\u062a\u0641\u0643 \u0623\u0648 \u062d\u0633\u0627\u0628 Google.', confirming: '\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u0623\u0643\u064a\u062f...', confirmCreate: '\u0623\u0643\u0651\u062f \u0648\u0623\u0646\u0634\u0626 \u0627\u0644\u062d\u0633\u0627\u0628', changePhone: '\u063a\u064a\u0651\u0631 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641', fullName: '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644', alreadyHave: '\u0644\u062f\u064a\u0643 \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644\u061f', googleSignInFailed: '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0640 Google \u0623\u0648 \u0641\u0634\u0644.', googleSignUpFailed: '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0628\u0640 Google \u0623\u0648 \u0641\u0634\u0644.',
  },
});

resources.ar.translation.nav.findit = '\u0627\u0639\u062b\u0631 \u0639\u0644\u064a\u0647\u0627';
resources.ar.translation.findit.navigation = '\u0627\u0639\u062b\u0631 \u0639\u0644\u064a\u0647\u0627';

Object.assign(resources.en.translation, {
  launch: {
    eyebrow: 'Focused launch',
    shortLabel: 'Under development',
    title: '{{section}} is under development',
    description: 'We are completing this section before opening it to the public. Products and FINDit are available now with cash on delivery.',
    products: 'Browse products',
    findit: 'Explore FINDit',
    sections: { courses: 'Courses', services: 'Services', digital: 'Digital products', bookings: 'Bookings' },
  },
});

Object.assign(resources.fr.translation, {
  launch: {
    eyebrow: 'Lancement ciblé',
    shortLabel: 'En cours de développement',
    title: '{{section}} est en cours de développement',
    description: 'Nous finalisons cette section avant de l’ouvrir au public. Les produits et FINDit sont disponibles avec le paiement à la livraison.',
    products: 'Voir les produits',
    findit: 'Découvrir FINDit',
    sections: { courses: 'Les cours', services: 'Les services', digital: 'Les produits numériques', bookings: 'Les réservations' },
  },
});

Object.assign(resources.ar.translation, {
  launch: {
    eyebrow: '\u0625\u0637\u0644\u0627\u0642 \u0645\u0631\u0643\u0632',
    shortLabel: '\u0642\u064a\u062f \u0627\u0644\u062a\u0637\u0648\u064a\u0631',
    title: '{{section}} \u0642\u064a\u062f \u0627\u0644\u062a\u0637\u0648\u064a\u0631',
    description: '\u0646\u064f\u0643\u0645\u0644 \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645 \u0642\u0628\u0644 \u0641\u062a\u062d\u0647 \u0644\u0644\u0639\u0645\u0648\u0645. \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0648\u0627\u0639\u062b\u0631 \u0639\u0644\u064a\u0647\u0627 \u0645\u062a\u0627\u062d\u0629 \u0627\u0644\u0622\u0646 \u0628\u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645.',
    products: '\u062a\u0635\u0641\u062d \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    findit: '\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0639\u062b\u0631 \u0639\u0644\u064a\u0647\u0627',
    sections: { courses: '\u0627\u0644\u062f\u0648\u0631\u0627\u062a', services: '\u0627\u0644\u062e\u062f\u0645\u0627\u062a', digital: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0631\u0642\u0645\u064a\u0629', bookings: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
  },
});

Object.assign(resources.en.translation.common, { search: 'Search products...' });
Object.assign(resources.fr.translation.common, { search: 'Rechercher des produits...' });
Object.assign(resources.ar.translation.common, { search: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c\u0627\u062a...' });
Object.assign(resources.en.translation.home, { valueStatement: 'Trusted products and FINDit requests, connecting Morocco to the world.' });
Object.assign(resources.fr.translation.home, { valueStatement: 'Des produits fiables et des demandes FINDit, du Maroc vers le monde.' });
Object.assign(resources.ar.translation.home, { valueStatement: '\u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0648\u062b\u0648\u0642\u0629 \u0648\u0637\u0644\u0628\u0627\u062a \u0627\u0639\u062b\u0631 \u0639\u0644\u064a\u0647\u0627 \u0645\u0646 \u0627\u0644\u0645\u063a\u0631\u0628 \u0625\u0644\u0649 \u0627\u0644\u0639\u0627\u0644\u0645.' });

Object.assign(resources.en.translation, {
  availability: {
    title: 'Marketplace temporarily unavailable',
    description: 'We cannot reach the rifKANDO marketplace service right now. No data has been changed. Please try again in a moment.',
    retry: 'Try again',
    liveData: 'Live data temporarily unavailable',
    productsAvailable: 'Products available',
    openRequests: 'Open FINDit requests',
    item: 'item',
    items: 'items',
  },
});

Object.assign(resources.fr.translation, {
  availability: {
    title: 'Place de marché temporairement indisponible',
    description: 'Le service de place de marché rifKANDO est momentanément inaccessible. Aucune donnée n’a été modifiée. Réessayez dans un instant.',
    retry: 'Réessayer',
    liveData: 'Données en direct temporairement indisponibles',
    productsAvailable: 'Produits disponibles',
    openRequests: 'Demandes FINDit ouvertes',
    item: 'article',
    items: 'articles',
  },
});

Object.assign(resources.ar.translation, {
  availability: {
    title: 'سوق rifKANDO غير متاح مؤقتًا',
    description: 'يتعذر الاتصال بخدمة سوق rifKANDO الآن. لم يتم تغيير أي بيانات. يُرجى المحاولة مرة أخرى بعد قليل.',
    retry: 'حاول مرة أخرى',
    liveData: 'البيانات المباشرة غير متاحة مؤقتًا',
    productsAvailable: 'المنتجات المتاحة',
    openRequests: 'طلبات FINDit المفتوحة',
    item: 'عنصر',
    items: 'عناصر',
  },
});

Object.assign(resources.en.translation.auth, {
  googleOnlyLead: 'Sign in securely with your Google account.',
  googleOnlyCreateLead: 'Create your account securely with Google.',
  phoneUnavailable: 'Phone sign-in will appear here once SMS delivery is available.',
});

Object.assign(resources.ar.translation.auth, {
  googleOnlyLead: 'سجّل الدخول بأمان باستخدام حساب Google.',
  googleOnlyCreateLead: 'أنشئ حسابك بأمان باستخدام Google.',
  phoneUnavailable: 'سيظهر تسجيل الدخول بالهاتف هنا عند توفر إرسال رسائل SMS.',
});

const replaceArabicFinditBrand = (value) => {
  if (typeof value === 'string') return value.replaceAll('FINDit', resources.ar.translation.findit.navigation);
  if (value && typeof value === 'object') Object.values(value).forEach(replaceArabicFinditBrand);
  return value;
};

replaceArabicFinditBrand(resources.ar.translation);

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
