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
      noSolutions: 'Your request is live. Sellers will appear here with a solution, exact item price, delivery quote, and estimate.',
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
      lead: 'Offer an exact item and realistic arrival time. COD Operations quotes delivery after the buyer confirms the order. FINDit orders use a 5% rifKANDO commission after COD settlement.',
      independent: 'Independent from Products',
      independentText: 'Your FINDit solution is visible only to the buyer who asked. It is never published in the product catalogue.',
      requests: 'Buyer requests', heading: 'Open needs you can solve', open: '{{count}} open', loading: 'Loading buyer requests...',
      emptyTitle: 'No open FINDit requests', emptyText: 'New requests will appear here when buyers need a specific item.',
      anyCondition: 'Any condition', requestedCondition: '{{condition}} requested', budgetOpen: 'Budget open', budgetUpTo: 'Up to {{amount}}',
      send: 'Send solution', yourSolution: 'Your solution: {{status}}',
      solutions: 'Your solutions', status: 'Offer status', noSolutions: 'When you answer a buyer request, its status appears here.',
      reply: 'Reply to FINDit request', formNote: 'Give the buyer a specific, truthful solution. Contact and payment stay inside rifKANDO.',
      solutionTitle: 'Solution title', solutionDescription: 'Why this is the right match', price: 'Item price in MAD', deliveryFee: 'Delivery fee in MAD', deliveryIncluded: '0 if included', deliveryQuoteNote: 'Delivery is quoted by rifKANDO COD Operations after the buyer accepts an offer.', estimate: 'Delivery estimate',
      commission: 'rifKANDO takes 5% of the item price only after this FINDit COD order is delivered and settled.',
      sending: 'Sending solution...', sent: 'Send FINDit solution', withdraw: 'Withdraw', withdrawConfirm: 'Withdraw this FINDit solution? The buyer will no longer be able to accept it.', withdrawn: 'FINDit solution withdrawn.',
    },
  },
});

resources.fr.translation.productDetails ??= {};
resources.fr.translation.productDetails.review ??= {};
Object.assign(resources.fr.translation.productDetails.review, {
  sellerReply: 'Réponse du vendeur', reply: 'Répondre publiquement', editReply: 'Modifier la réponse', replyLabel: 'Votre réponse publique', replyPlaceholder: 'Remerciez l’acheteur ou clarifiez l’expérience avec professionnalisme.', replySave: 'Enregistrer la réponse', replySaving: 'Enregistrement…', replySaved: 'Réponse du vendeur enregistrée.', replyFailed: 'Impossible d’enregistrer votre réponse.', replyValidation: 'Votre réponse doit contenir au moins 2 caractères.', replyDate: 'Réponse le {{date}}',
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

// Product creation, media, and shared accessibility copy. These values are kept
// separate from user-created listing titles and descriptions, which stay in the
// language supplied by their author.
Object.assign(resources.en.translation, {
  productForm: {
    addTitle: 'Add new product', editTitle: 'Edit product', loading: 'Loading product data…',
    title: 'Product title', description: 'Description', descriptionHelp: 'Use at least 10 characters so buyers understand the listing.',
    price: 'Price (MAD)', originalPrice: 'Original price (optional)', dispatchCity: 'Dispatch city', dispatchCityPlaceholder: 'For example: Nador', dispatchCityHelp: 'Shown to buyers as the seller’s dispatch location.',
    preparation: 'Preparation time', sameDay: 'Same day', dayCount: '{{count}} day(s)', preparationHelp: 'rifKANDO COD Operations sets the buyer delivery deadline after you confirm the order.',
    estimate: 'COD listing estimate', enterPrice: 'Enter a product price', commission: 'rifKANDO commission is 5% of the item price only ({{amount}}).', deliveryQuote: 'Delivery is quoted by rifKANDO COD Operations for each confirmed order, based on the parcel and destination.',
    settlementNote: 'Commission is due only after a COD delivery is confirmed and settled. Delivery money is separate.', coverHelp: 'Update the cover image or order below to control what buyers see first.',
    category: 'Category', stock: 'Stock quantity', condition: 'Condition', media: 'Product photos and videos (1–10 required)', publish: 'Publish product', publishing: 'Creating…', save: 'Save changes', saving: 'Saving…', cancel: 'Cancel',
    categoryOptions: { electronics: 'Electronics', fashion: 'Fashion', handicrafts: 'Handicrafts', books: 'Books', home: 'Home & living' },
    conditionOptions: { new: 'New', used_as_new: 'Used as new', joutiya: 'Joutiya' },
    conditionHelp: { new: 'Brand new, never used.', used_as_new: 'Item is pre-owned but in excellent condition.', joutiya: 'Buyers can make offers instead of buying directly.' },
    validation: { title: 'Product title must contain at least 2 characters.', description: 'Description must contain at least 10 characters.', price: 'Enter a valid product price.', stock: 'Stock must be a whole number of 0 or more.', originalPrice: 'Original price must be at least the current product price.', media: 'Add at least one clear product photo before publishing.', saveMedia: 'Keep at least one clear product photo before saving.' },
    created: 'Product created successfully!', updated: 'Product updated successfully!', loadFailed: 'Failed to load product data', createFailed: 'Failed to create product', updateFailed: 'Failed to update product',
  },
  productDetails: {
    loading: 'Loading product…', notFound: 'Product not found', back: 'Back', home: 'Home', products: 'Products', video: 'Video', reviews: '{{count}} reviews', quantity: 'Quantity', decrease: 'Decrease quantity', increase: 'Increase quantity',
    signInCart: 'Please sign in to add items to your cart', signInOffer: 'Please sign in to make an offer', signInFavorite: 'Please sign in to add to favorites', offerAmount: 'Please enter a valid offer amount', offerTooHigh: 'Offer cannot exceed the original price of {{price}} MAD', offerSent: 'Offer of {{amount}} MAD sent to seller!', offerFailed: 'Failed to submit offer',
    reportSignIn: 'Please sign in to report a listing.', reportDetails: 'Please provide at least a short explanation.', reportThanks: 'Thanks. Our moderation team will review this listing.', reportFailed: 'Unable to submit this report.',
    reviewRating: 'Please select a rating', reviewSent: 'Review submitted successfully!', reviewFailed: 'Failed to submit review', tabs: { description: 'Description', specifications: 'Specifications', reviews: 'Reviews ({{count}})' },
    shipping: { shipsFrom: 'Ships from {{city}}', prepares: 'Seller prepares in {{time}}. rifKANDO COD Operations confirms the delivery fee and arrival deadline after the order is confirmed.', sameDay: 'the same day', days: '{{count}} day(s)', category: 'Category', condition: 'Condition', availability: 'Availability', unitsAvailable: '{{count}} units available', sold: 'Sold', units: '{{count}} units', dispatch: 'Dispatch', sellerLocation: 'Seller location shared at checkout', deliveryPlan: 'Delivery plan', deliveryPlanValue: 'Set by rifKANDO COD Operations after confirmation' },
    review: { write: 'Write a review', rating: 'Your rating:', comment: 'Your review:', commentPlaceholder: 'Share your experience with this product...', submitting: 'Submitting…', submit: 'Submit review', already: 'You have already reviewed this product. Thank you for your feedback!', eligibility: 'You can only review this product after purchasing and receiving it.', signIn: 'Sign in after delivery to leave a review.', customer: 'Customer reviews', empty: 'No reviews yet. Be the first to review!', sellerReply: 'Seller response', reply: 'Reply publicly', editReply: 'Edit response', replyLabel: 'Your public response', replyPlaceholder: 'Thank the buyer or clarify the experience professionally.', replySave: 'Save response', replySaving: 'Saving response…', replySaved: 'Seller response saved.', replyFailed: 'Unable to save your response.', replyValidation: 'Write at least 2 characters for your response.', replyDate: 'Responded {{date}}' },
    offer: { title: 'Make an offer', close: 'Close offer form', product: 'Product:', originalPrice: 'Original price:', amount: 'Your offer (MAD):', amountPlaceholder: 'For example: 50', message: 'Message to seller (optional):', messagePlaceholder: 'For example: I like this product. Can you offer a better price?', cancel: 'Cancel', sending: 'Sending…', submit: 'Submit offer' },
    report: { title: 'Report this listing', close: 'Close report form', lead: 'Reports are private. Please describe only what our moderation team needs to review.', reason: 'Reason', details: 'What should we review?', detailsPlaceholder: 'Give clear details, at least 10 characters.', cancel: 'Cancel', submitting: 'Submitting…', submit: 'Submit report', reasons: { scam: 'Possible scam', prohibited: 'Prohibited or unsafe item', misleading: 'Misleading listing', counterfeit: 'Suspected counterfeit', other: 'Other concern' } },
  },
  sellerProducts: {
    loading: 'Loading your products', loadFailed: 'Failed to load products', endConfirm: 'Mark this product as ended? It will no longer appear in marketplace listings.', ended: 'Product marked as ended', updateFailed: 'Failed to update status', deleteConfirm: 'Are you sure you want to delete this product?', deleted: 'Product deleted successfully', deleteFailed: 'Failed to delete product',
    stats: { total: 'Total products', active: 'Active listings', value: 'Inventory value', stockValue: 'Total stock value', sold: 'Total sold', unitsSold: 'Units sold', low: 'Low stock items', restock: 'Need restock' },
    title: 'Your products', add: 'Add product', emptyTitle: 'Your shop is ready for its first listing', emptyLead: 'Add a product with clear photos and details to start reaching customers.', first: 'Add your first product', columns: { product: 'Product', price: 'Price', condition: 'Condition', stock: 'Stock', sold: 'Sold', status: 'Status', actions: 'Actions' },
    lowStock: 'Low stock!', active: 'Active', endedStatus: 'Ended', view: 'View product', edit: 'Edit product', end: 'Mark as ended', remove: 'Delete permanently',
  },
  sellerOverview: {
    loading: 'Loading seller dashboard', loadFailed: 'Failed to load dashboard data', pending: 'Pending', products: 'Products', orderValue: 'Order value', orders: 'Orders', views: 'Listing views',
    welcome: 'Welcome back, {{name}}!', activeLead: 'Here is what is happening with your store today.', emptyLead: 'Almost there. Your shop is ready for its first listing.', manage: 'Manage your products', create: 'Create your first product',
    gettingStarted: 'Getting started · {{done}}/{{total}}', setup: 'Set up your shop', setupLead: 'Finish these essentials to build trust and start selling.', profile: 'Complete your profile', firstListing: 'Publish your first listing', recentSales: 'Recent sales', viewAll: 'View all', noSales: 'No sales yet', noSalesLead: 'Your first sale will appear here once a customer checks out.', columns: { id: 'Order ID', customer: 'Customer', amount: 'Amount', status: 'Status', date: 'Date' }, customer: 'Customer',
  },
  media: { noPreview: 'No preview available', noImageFor: 'No image available for {{title}}' },
  protected: { loading: 'Loading…' },
});

Object.assign(resources.ar.translation, {
  productForm: {
    addTitle: 'إضافة منتج جديد', editTitle: 'تعديل المنتج', loading: 'جارٍ تحميل بيانات المنتج…',
    title: 'عنوان المنتج', description: 'الوصف', descriptionHelp: 'اكتب 10 أحرف على الأقل حتى يفهم المشترون المنتج بوضوح.',
    price: 'السعر بالدرهم', originalPrice: 'السعر الأصلي اختياري', dispatchCity: 'مدينة الإرسال', dispatchCityPlaceholder: 'مثال: الناظور', dispatchCityHelp: 'تظهر للمشترين كموقع إرسال البائع.',
    preparation: 'مدة التحضير', sameDay: 'في اليوم نفسه', dayCount: '{{count}} يومًا', preparationHelp: 'يحدد فريق عمليات الدفع عند الاستلام في rifKANDO موعد وصول المشتري بعد تأكيدك للطلب.',
    estimate: 'تقدير قائمة الدفع عند الاستلام', enterPrice: 'أدخل سعر المنتج', commission: 'عمولة rifKANDO هي 5% من سعر المنتج فقط ({{amount}}).', deliveryQuote: 'يحدد فريق عمليات الدفع عند الاستلام في rifKANDO تكلفة التوصيل لكل طلب مؤكد حسب الطرد والوجهة.',
    settlementNote: 'تستحق العمولة فقط بعد تأكيد وتسوية تسليم الدفع عند الاستلام. رسوم التوصيل منفصلة.', coverHelp: 'حدّث صورة الغلاف أو ترتيب الوسائط أدناه للتحكم بما يراه المشتري أولًا.',
    category: 'الفئة', stock: 'كمية المخزون', condition: 'الحالة', media: 'صور وفيديوهات المنتج من 1 إلى 10 مطلوبة', publish: 'نشر المنتج', publishing: 'جارٍ الإنشاء…', save: 'حفظ التعديلات', saving: 'جارٍ الحفظ…', cancel: 'إلغاء',
    categoryOptions: { electronics: 'الإلكترونيات', fashion: 'الأزياء', handicrafts: 'الصناعات اليدوية', books: 'الكتب', home: 'المنزل والمعيشة' },
    conditionOptions: { new: 'جديد', used_as_new: 'مستعمل كالجديد', joutiya: 'جوطية' },
    conditionHelp: { new: 'جديد تمامًا ولم يُستعمل من قبل.', used_as_new: 'منتج مستعمل بحالة ممتازة.', joutiya: 'يمكن للمشترين تقديم عروض بدل الشراء المباشر.' },
    validation: { title: 'يجب أن يحتوي عنوان المنتج على حرفين على الأقل.', description: 'يجب أن يحتوي الوصف على 10 أحرف على الأقل.', price: 'أدخل سعرًا صحيحًا للمنتج.', stock: 'يجب أن تكون كمية المخزون رقمًا صحيحًا يساوي صفرًا أو أكثر.', originalPrice: 'يجب أن يكون السعر الأصلي مساويًا لسعر المنتج الحالي أو أعلى منه.', media: 'أضف صورة واضحة واحدة على الأقل للمنتج قبل النشر.', saveMedia: 'احتفظ بصورة واضحة واحدة على الأقل للمنتج قبل الحفظ.' },
    created: 'تم إنشاء المنتج بنجاح.', updated: 'تم تحديث المنتج بنجاح.', loadFailed: 'تعذر تحميل بيانات المنتج', createFailed: 'تعذر إنشاء المنتج', updateFailed: 'تعذر تحديث المنتج',
  },
  productDetails: {
    loading: 'جارٍ تحميل المنتج…', notFound: 'المنتج غير موجود', back: 'رجوع', home: 'الرئيسية', products: 'المنتجات', video: 'فيديو', reviews: '{{count}} مراجعة', quantity: 'الكمية', decrease: 'تقليل الكمية', increase: 'زيادة الكمية',
    signInCart: 'سجّل الدخول لإضافة منتجات إلى سلتك', signInOffer: 'سجّل الدخول لتقديم عرض', signInFavorite: 'سجّل الدخول لإضافة المنتج إلى المفضلة', offerAmount: 'أدخل مبلغ عرض صحيحًا', offerTooHigh: 'لا يمكن أن يتجاوز العرض السعر الأصلي وهو {{price}} درهم', offerSent: 'تم إرسال عرض بقيمة {{amount}} درهم إلى البائع.', offerFailed: 'تعذر إرسال العرض',
    reportSignIn: 'سجّل الدخول للإبلاغ عن هذا الإعلان.', reportDetails: 'يرجى تقديم شرح قصير على الأقل.', reportThanks: 'شكرًا. سيراجع فريق الإشراف هذا الإعلان.', reportFailed: 'تعذر إرسال البلاغ.',
    reviewRating: 'يرجى اختيار تقييم', reviewSent: 'تم إرسال المراجعة بنجاح.', reviewFailed: 'تعذر إرسال المراجعة', tabs: { description: 'الوصف', specifications: 'المواصفات', reviews: 'المراجعات {{count}}' },
    shipping: { shipsFrom: 'يُرسل من {{city}}', prepares: 'يحضّر البائع المنتج خلال {{time}}. يؤكد فريق عمليات الدفع عند الاستلام في rifKANDO رسوم التوصيل وموعد الوصول بعد تأكيد الطلب.', sameDay: 'اليوم نفسه', days: '{{count}} يومًا', category: 'الفئة', condition: 'الحالة', availability: 'التوفر', unitsAvailable: '{{count}} وحدة متاحة', sold: 'المباع', units: '{{count}} وحدة', dispatch: 'الإرسال', sellerLocation: 'يتم إبلاغ موقع البائع عند إتمام الطلب', deliveryPlan: 'خطة التوصيل', deliveryPlanValue: 'يحددها فريق عمليات rifKANDO بعد التأكيد' },
    review: { write: 'اكتب مراجعة', rating: 'تقييمك:', comment: 'مراجعتك:', commentPlaceholder: 'شارك تجربتك مع هذا المنتج...', submitting: 'جارٍ الإرسال…', submit: 'إرسال المراجعة', already: 'سبق أن راجعت هذا المنتج. شكرًا على رأيك!', eligibility: 'يمكنك مراجعة هذا المنتج فقط بعد شرائه واستلامه.', signIn: 'سجّل الدخول بعد التسليم لكتابة مراجعة.', customer: 'مراجعات العملاء', empty: 'لا توجد مراجعات بعد. كن أول من يراجع المنتج!', sellerReply: 'رد البائع', reply: 'رد علنًا', editReply: 'تعديل الرد', replyLabel: 'ردك العلني', replyPlaceholder: 'اشكر المشتري أو وضّح التجربة باحترافية.', replySave: 'حفظ الرد', replySaving: 'جارٍ حفظ الرد…', replySaved: 'تم حفظ رد البائع.', replyFailed: 'تعذر حفظ ردك.', replyValidation: 'اكتب حرفين على الأقل في ردك.', replyDate: 'تم الرد في {{date}}' },
    offer: { title: 'قدّم عرضًا', close: 'إغلاق نموذج العرض', product: 'المنتج:', originalPrice: 'السعر الأصلي:', amount: 'عرضك بالدرهم:', amountPlaceholder: 'مثال: 50', message: 'رسالة إلى البائع اختياري', messagePlaceholder: 'مثال: أعجبني المنتج، هل يمكنك تقديم سعر أفضل؟', cancel: 'إلغاء', sending: 'جارٍ الإرسال…', submit: 'إرسال العرض' },
    report: { title: 'الإبلاغ عن هذا الإعلان', close: 'إغلاق نموذج البلاغ', lead: 'البلاغات خاصة. يرجى وصف ما يحتاج فريق الإشراف إلى مراجعته فقط.', reason: 'السبب', details: 'ما الذي يجب مراجعته؟', detailsPlaceholder: 'اكتب تفاصيل واضحة، 10 أحرف على الأقل.', cancel: 'إلغاء', submitting: 'جارٍ الإرسال…', submit: 'إرسال البلاغ', reasons: { scam: 'احتيال محتمل', prohibited: 'منتج محظور أو غير آمن', misleading: 'إعلان مضلل', counterfeit: 'تقليد مشتبه به', other: 'مشكلة أخرى' } },
  },
  sellerProducts: {
    loading: 'جارٍ تحميل منتجاتك', loadFailed: 'تعذر تحميل المنتجات', endConfirm: 'هل تريد إنهاء عرض هذا المنتج؟ لن يظهر بعد الآن في قوائم السوق.', ended: 'تم إنهاء عرض المنتج', updateFailed: 'تعذر تحديث الحالة', deleteConfirm: 'هل أنت متأكد من حذف هذا المنتج؟', deleted: 'تم حذف المنتج بنجاح', deleteFailed: 'تعذر حذف المنتج',
    stats: { total: 'إجمالي المنتجات', active: 'إعلانات نشطة', value: 'قيمة المخزون', stockValue: 'إجمالي قيمة المخزون', sold: 'إجمالي المبيعات', unitsSold: 'الوحدات المباعة', low: 'منتجات بمخزون منخفض', restock: 'تحتاج إلى إعادة التخزين' },
    title: 'منتجاتك', add: 'إضافة منتج', emptyTitle: 'متجرك جاهز لأول إعلان', emptyLead: 'أضف منتجًا بصور واضحة وتفاصيل دقيقة لتبدأ الوصول إلى العملاء.', first: 'أضف منتجك الأول', columns: { product: 'المنتج', price: 'السعر', condition: 'الحالة', stock: 'المخزون', sold: 'المباع', status: 'الحالة', actions: 'الإجراءات' },
    lowStock: 'مخزون منخفض!', active: 'نشط', endedStatus: 'منتهٍ', view: 'عرض المنتج', edit: 'تعديل المنتج', end: 'إنهاء العرض', remove: 'حذف نهائي',
  },
  sellerOverview: {
    loading: 'جارٍ تحميل لوحة تحكم البائع', loadFailed: 'تعذر تحميل بيانات لوحة التحكم', pending: 'قيد الانتظار', products: 'المنتجات', orderValue: 'قيمة الطلبات', orders: 'الطلبات', views: 'مشاهدات الإعلانات',
    welcome: 'مرحبًا بعودتك، {{name}}!', activeLead: 'إليك ما يحدث في متجرك اليوم.', emptyLead: 'أوشكت على الانتهاء. متجرك جاهز لأول إعلان.', manage: 'إدارة منتجاتك', create: 'أنشئ منتجك الأول',
    gettingStarted: 'البدء · {{done}}/{{total}}', setup: 'جهّز متجرك', setupLead: 'أكمل هذه الأساسيات لبناء الثقة وبدء البيع.', profile: 'أكمل ملفك الشخصي', firstListing: 'انشر أول إعلان لك', recentSales: 'أحدث المبيعات', viewAll: 'عرض الكل', noSales: 'لا توجد مبيعات بعد', noSalesLead: 'ستظهر أول عملية بيع هنا بعد إتمام العميل للطلب.', columns: { id: 'رقم الطلب', customer: 'العميل', amount: 'المبلغ', status: 'الحالة', date: 'التاريخ' }, customer: 'العميل',
  },
  media: { noPreview: 'لا توجد معاينة متاحة', noImageFor: 'لا توجد صورة متاحة لـ {{title}}' },
  protected: { loading: 'جارٍ التحميل…' },
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
// French intentionally falls back to English for FINDit until its complete
// translation is added. Create the nested objects before adding the one
// delivery-specific French string so startup never depends on that fallback.
resources.fr.translation.findit ??= {};
resources.fr.translation.findit.seller ??= {};
Object.assign(resources.fr.translation.findit.seller, {
  deliveryQuoteNote: 'La livraison est déterminée par les opérations COD de rifKANDO après l’acceptation de l’offre par l’acheteur.',
});
Object.assign(resources.ar.translation.findit.seller, {
  deliveryQuoteNote: 'يحدد فريق عمليات الدفع عند الاستلام في rifKANDO رسوم التوصيل بعد قبول المشتري للعرض.',
});

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
    browseTitle: 'Browsing mode is on.',
    browseDescription: 'You can explore rifKANDO, but live actions such as sign-in, publishing, cart, and checkout will return when the service reconnects.',
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
    browseTitle: 'Mode consultation activé.',
    browseDescription: 'Vous pouvez explorer rifKANDO, mais les actions en direct, comme la connexion, la publication, le panier et la commande, reviendront dès que le service sera reconnecté.',
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
    browseTitle: 'وضع التصفح مفعّل.',
    browseDescription: 'يمكنك استكشاف rifKANDO، لكن الإجراءات المباشرة مثل تسجيل الدخول والنشر والسلة وإتمام الطلب ستعود عند عودة الاتصال بالخدمة.',
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
  googlePasskeyLoginLead: 'Sign in securely with Google or a passkey.',
  googlePasskeyRegisterLead: 'Create your account securely with Google or a passkey.',
  phoneUnavailable: 'Phone sign-in will appear here once SMS delivery is available.',
  email: 'Email address',
  passkeyWelcome: 'Welcome back',
  passkeyJoin: 'Create your account',
  passkeyLoginLead: 'Choose the passkey saved on this device or another device.',
  passkeyRegisterLead: 'Use your device lock to create a password-free rifKANDO account.',
  passkeyHint: 'Approve with your fingerprint, face, or device PIN. No password or email is required.',
  passkeyPrivacy: 'Your fingerprint, face, and device PIN stay on your device. rifKANDO receives only a public cryptographic key.',
  continuePasskey: 'Continue with passkey',
  createPasskey: 'Create secure passkey',
  passkeyChecking: 'Checking your passkey...',
  passkeyCreating: 'Creating your passkey...',
  passkeyUnavailable: 'Passkeys are not available in this browser or device.',
});

Object.assign(resources.ar.translation.auth, {
  googleOnlyLead: 'سجّل الدخول بأمان باستخدام حساب Google.',
  googleOnlyCreateLead: 'أنشئ حسابك بأمان باستخدام Google.',
  googlePasskeyLoginLead: 'سجّل الدخول بأمان باستخدام Google أو مفتاح مرور.',
  googlePasskeyRegisterLead: 'أنشئ حسابك بأمان باستخدام Google أو مفتاح مرور.',
  phoneUnavailable: 'سيظهر تسجيل الدخول بالهاتف هنا عند توفر إرسال رسائل SMS.',
  email: 'البريد الإلكتروني',
  passkeyWelcome: 'مرحبًا بعودتك',
  passkeyJoin: 'أنشئ حسابك',
  passkeyLoginLead: 'اختر مفتاح المرور المحفوظ على هذا الجهاز أو على جهاز آخر.',
  passkeyRegisterLead: 'استخدم قفل جهازك لإنشاء حساب rifKANDO آمن بدون كلمة مرور.',
  passkeyHint: 'وافق ببصمة الإصبع أو الوجه أو رمز الجهاز. لا تحتاج إلى كلمة مرور أو بريد إلكتروني.',
  passkeyPrivacy: 'تبقى بصمتك ووجهك ورمز جهازك على جهازك. يستلم rifKANDO مفتاحًا عامًا مشفرًا فقط.',
  continuePasskey: 'المتابعة باستخدام مفتاح المرور',
  createPasskey: 'إنشاء مفتاح مرور آمن',
  passkeyChecking: 'جارٍ التحقق من مفتاح المرور...',
  passkeyCreating: 'جارٍ إنشاء مفتاح المرور...',
  passkeyUnavailable: 'مفاتيح المرور غير متاحة في هذا المتصفح أو الجهاز.',
});

resources.fr.translation.auth ||= {};
Object.assign(resources.fr.translation.auth, {
  email: 'Adresse e-mail',
  googlePasskeyLoginLead: 'Connectez-vous en toute sécurité avec Google ou une clé d’accès.',
  googlePasskeyRegisterLead: 'Créez votre compte en toute sécurité avec Google ou une clé d’accès.',
  passkeyWelcome: 'Bon retour',
  passkeyJoin: 'Créez votre compte',
  passkeyLoginLead: 'Choisissez la clé d’accès enregistrée sur cet appareil ou sur un autre appareil.',
  passkeyRegisterLead: 'Utilisez le verrouillage de votre appareil pour créer un compte rifKANDO sans mot de passe.',
  passkeyHint: 'Validez avec votre empreinte, votre visage ou le code de votre appareil. Aucun mot de passe ni e-mail n’est nécessaire.',
  passkeyPrivacy: 'Votre empreinte, votre visage et le code de votre appareil restent sur votre appareil. rifKANDO reçoit uniquement une clé cryptographique publique.',
  continuePasskey: 'Continuer avec une clé d’accès',
  createPasskey: 'Créer une clé d’accès sécurisée',
  passkeyChecking: 'Vérification de votre clé d’accès...',
  passkeyCreating: 'Création de votre clé d’accès...',
  passkeyUnavailable: 'Les clés d’accès ne sont pas disponibles dans ce navigateur ou sur cet appareil.',
});

Object.assign(resources.en.translation, {
  products: {
    loading: 'Loading products', title: 'Products', lead: 'Discover trusted products from Moroccan sellers.',
    search: 'Search', searchPlaceholder: 'Search products...', filters: 'Filters', clearFilters: 'Clear filters',
    category: 'Category', allCategories: 'All categories', minPrice: 'Min price', maxPrice: 'Max price', sort: 'Sort products',
    sortNewest: 'Newest first', sortPriceAsc: 'Price: low to high', sortPriceDesc: 'Price: high to low', sortRating: 'Top rated', sortPopular: 'Most popular',
    activeFilters: 'Active filters', from: 'From', upTo: 'Up to', results: '{{count}} products found{{filters}}', withFilters: 'with {{count}} active filters',
    viewMedia: 'View media for {{title}}', video: 'Video', itemCount: '{{count}} items', by: 'by', unknownSeller: 'Unknown seller', reviewCount: '{{count}} reviews',
    makeOffer: 'Make an offer', addToCart: 'Add to cart', previous: 'Previous', next: 'Next', pageOf: 'Page {{current}} of {{total}}', signInRequired: 'Please sign in first.',
    conditions: { new: 'New', usedAsNew: 'Used as new', joutiya: 'Joutiya (haggle)' },
    categories: { electronics: 'Electronics', fashion: 'Fashion', handicrafts: 'Handicrafts', books: 'Books', home: 'Home' },
  },
});

Object.assign(resources.fr.translation, {
  products: {
    loading: 'Chargement des produits', title: 'Produits', lead: 'Découvrez des produits fiables proposés par des vendeurs marocains.',
    search: 'Rechercher', searchPlaceholder: 'Rechercher des produits...', filters: 'Filtres', clearFilters: 'Effacer les filtres',
    category: 'Catégorie', allCategories: 'Toutes les catégories', minPrice: 'Prix minimum', maxPrice: 'Prix maximum', sort: 'Trier les produits',
    sortNewest: 'Plus récents', sortPriceAsc: 'Prix : croissant', sortPriceDesc: 'Prix : décroissant', sortRating: 'Mieux notés', sortPopular: 'Les plus populaires',
    activeFilters: 'Filtres actifs', from: 'À partir de', upTo: 'Jusqu’à', results: '{{count}} produits trouvés{{filters}}', withFilters: 'avec {{count}} filtres actifs',
    viewMedia: 'Voir les médias de {{title}}', video: 'Vidéo', itemCount: '{{count}} éléments', by: 'par', unknownSeller: 'Vendeur inconnu', reviewCount: '{{count}} avis',
    makeOffer: 'Faire une offre', addToCart: 'Ajouter au panier', previous: 'Précédent', next: 'Suivant', pageOf: 'Page {{current}} sur {{total}}', signInRequired: 'Connectez-vous d’abord.',
    conditions: { new: 'Neuf', usedAsNew: 'Comme neuf', joutiya: 'Joutiya (négociation)' },
    categories: { electronics: 'Électronique', fashion: 'Mode', handicrafts: 'Artisanat', books: 'Livres', home: 'Maison' },
  },
});

Object.assign(resources.ar.translation, {
  products: {
    loading: 'جارٍ تحميل المنتجات', title: 'المنتجات', lead: 'اكتشف منتجات موثوقة من بائعين مغاربة.',
    search: 'بحث', searchPlaceholder: 'ابحث عن منتجات...', filters: 'التصفية', clearFilters: 'مسح التصفية',
    category: 'الفئة', allCategories: 'كل الفئات', minPrice: 'أقل سعر', maxPrice: 'أعلى سعر', sort: 'ترتيب المنتجات',
    sortNewest: 'الأحدث أولًا', sortPriceAsc: 'السعر: من الأقل إلى الأعلى', sortPriceDesc: 'السعر: من الأعلى إلى الأقل', sortRating: 'الأعلى تقييمًا', sortPopular: 'الأكثر رواجًا',
    activeFilters: 'الفلاتر النشطة', from: 'من', upTo: 'حتى', results: 'تم العثور على {{count}} منتج{{filters}}', withFilters: 'مع {{count}} فلترًا نشطًا',
    viewMedia: 'عرض وسائط {{title}}', video: 'فيديو', itemCount: '{{count}} عناصر', by: 'بواسطة', unknownSeller: 'بائع غير معروف', reviewCount: '{{count}} مراجعات',
    makeOffer: 'قدّم عرضًا', addToCart: 'أضف إلى السلة', previous: 'السابق', next: 'التالي', pageOf: 'الصفحة {{current}} من {{total}}', signInRequired: 'سجّل الدخول أولًا.',
    conditions: { new: 'جديد', usedAsNew: 'مستعمل بحالة جديدة', joutiya: 'الجوطية (مساومة)' },
    categories: { electronics: 'إلكترونيات', fashion: 'أزياء', handicrafts: 'صناعة تقليدية', books: 'كتب', home: 'المنزل' },
  },
});

Object.assign(resources.en.translation, {
  notFound: { title: 'This page is not available', lead: 'The link may be incorrect, or the page may have moved. You can safely return to rifKANDO and keep exploring.', home: 'Go to home', products: 'Browse products' },
  buyer: {
    items_one: '{{count}} item', items_other: '{{count}} items', seller: 'Seller', orderSummary: 'Order summary', subtotal: 'Subtotal', shipping: 'Shipping', total: 'Total', free: 'Free', payment: 'Payment', confirm: 'Confirm', back: 'Back', cashOnDelivery: 'Cash on Delivery',
    cart: { emptyTitle: 'Your cart is empty', emptyLead: "Looks like you haven't added anything to your cart yet.", continueShopping: 'Continue shopping', eyebrow: 'Your basket', title: 'Shopping cart', headingNote: 'Review your items before checkout.', soldBy: 'Sold by {{seller}}', quantityFor: 'Quantity for {{title}}', decreaseQuantity: 'Decrease quantity for {{title}}', increaseQuantity: 'Increase quantity for {{title}}', lineTotal: 'Line total', removeItem: 'Remove {{title}} from cart', shippingNote: 'Delivery is set by each seller and confirmed in your COD order.', continueCheckout: 'Continue to checkout', secureNote: 'Delivery and payment details are reviewed at checkout.' },
    checkout: { deliveryDetailsRequired: 'Please complete your delivery details before continuing.', orderPlaced: 'COD order placed. Thank you for shopping with rifKANDO!', orderFailed: 'Failed to place order.', emptyLead: 'Add items to your cart before checking out.', eyebrow: 'Secure checkout', title: 'Complete your order', lead: 'Review delivery and payment details before placing your order.', shippingInformation: 'Shipping information', fullName: 'Full name', email: 'Email', phone: 'Phone', city: 'City', address: 'Address', postalCode: 'Postal code', orderNotes: 'Order notes (optional)', notesPlaceholder: 'Special delivery instructions...', continuePayment: 'Continue to payment', paymentMethod: 'Payment method', codLead: 'Pay when your order is delivered.', reviewOrder: 'Review order', reviewTitle: 'Review your order', shippingAddress: 'Shipping address', orderItems: 'Order items', orderTotal: 'Order total', processing: 'Processing...', placeCodOrder: 'Place COD order', secureNote: 'Payment and delivery details are confirmed before your order is created.' },
    orders: { loadFailed: 'Failed to load orders.', status: { pending: 'Pending', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }, creditCard: 'Credit card', wallet: 'Wallet', unknown: 'Unknown', invoiceDownloaded: 'Invoice downloaded.', invoiceFailed: 'Failed to download invoice.', loading: 'Loading orders', emptyTitle: 'No orders yet', emptyLead: 'When you place an order, its status and invoice will appear here.', startShopping: 'Start shopping', title: 'My orders', count_one: '{{count}} order', count_other: '{{count}} orders', orderId: 'Order ID', items: 'Items', statusLabel: 'Status', date: 'Date', action: 'Action', view: 'View' },
  },
  codOps: {
    eyebrow: 'Internal team workspace', title: 'COD Operations Desk', lead: 'Coordinate seller handoffs, carrier tracking, and delivery reports. Cash collection, rifKANDO commission, and seller payouts stay in finance control.', refresh: 'Refresh queue', whatsapp: 'WhatsApp operations', loading: 'Loading COD operations…', empty: 'No COD tasks in this view.', product: 'Product', orderItem: 'Order item', buyerDestination: 'Buyer and destination', sellerParcel: 'Seller and parcel', codTarget: 'COD collection target', buyer: 'Buyer', seller: 'Seller', noPhone: 'No phone recorded', noAddress: 'Address not provided', noSellerNote: 'No seller note provided', messageBuyer: 'Message buyer', messageSeller: 'Message seller', codReference: 'This is a delivery reference only. Finance records real cash evidence separately.', buyerMessage: 'Hello {{name}}, this is the rifKANDO delivery team about order {{order}}. We are arranging your COD delivery.', sellerMessage: 'Hello {{name}}, this is Toufiq from rifKANDO delivery about order {{order}}. Please confirm the parcel handoff details.', filters: { active: 'Active work', pickup: 'Pickup requested', delivery: 'Delivery reports', closed: 'History' }, stages: { pickupRequested: 'Pickup requested', waitingHandoff: 'Waiting for seller handoff', reported: 'Reported: {{outcome}}', inDelivery: 'In delivery', deliveredFollowup: 'Delivered, finance follow-up' }, outcomes: { delivered: 'delivered', refused: 'refused', returned: 'returned' }, success: { pickup: 'Pickup and tracking recorded.', delivery: 'Delivery outcome reported to rifKANDO finance.' }, errors: { load: 'Unable to load the COD operations desk.', update: 'The COD task could not be updated.' },
  },
});

Object.assign(resources.fr.translation, {
  notFound: { title: 'Cette page n’est pas disponible', lead: 'Le lien est peut-être incorrect ou la page a été déplacée. Vous pouvez retourner sur rifKANDO et continuer votre navigation.', home: 'Accueil', products: 'Voir les produits' },
  buyer: {
    items_one: '{{count}} article', items_other: '{{count}} articles', seller: 'Vendeur', orderSummary: 'Récapitulatif de commande', subtotal: 'Sous-total', shipping: 'Livraison', total: 'Total', free: 'Gratuite', payment: 'Paiement', confirm: 'Confirmer', back: 'Retour', cashOnDelivery: 'Paiement à la livraison',
    cart: { emptyTitle: 'Votre panier est vide', emptyLead: 'Vous n’avez encore ajouté aucun article à votre panier.', continueShopping: 'Continuer vos achats', eyebrow: 'Votre panier', title: 'Panier', headingNote: 'Vérifiez vos articles avant de passer commande.', soldBy: 'Vendu par {{seller}}', quantityFor: 'Quantité pour {{title}}', decreaseQuantity: 'Diminuer la quantité de {{title}}', increaseQuantity: 'Augmenter la quantité de {{title}}', lineTotal: 'Total de la ligne', removeItem: 'Retirer {{title}} du panier', shippingNote: 'La livraison est définie par chaque vendeur puis confirmée dans votre commande COD.', continueCheckout: 'Passer à la commande', secureNote: 'Les détails de livraison et de paiement sont vérifiés à la commande.' },
    checkout: { deliveryDetailsRequired: 'Veuillez compléter vos informations de livraison avant de continuer.', orderPlaced: 'Commande COD créée. Merci de votre confiance envers rifKANDO !', orderFailed: 'Impossible de créer la commande.', emptyLead: 'Ajoutez des articles au panier avant de commander.', eyebrow: 'Commande sécurisée', title: 'Finalisez votre commande', lead: 'Vérifiez les détails de livraison et de paiement avant de commander.', shippingInformation: 'Informations de livraison', fullName: 'Nom complet', email: 'E-mail', phone: 'Téléphone', city: 'Ville', address: 'Adresse', postalCode: 'Code postal', orderNotes: 'Notes de commande (facultatif)', notesPlaceholder: 'Instructions particulières de livraison...', continuePayment: 'Continuer vers le paiement', paymentMethod: 'Mode de paiement', codLead: 'Payez lorsque votre commande est livrée.', reviewOrder: 'Vérifier la commande', reviewTitle: 'Vérifiez votre commande', shippingAddress: 'Adresse de livraison', orderItems: 'Articles commandés', orderTotal: 'Total de la commande', processing: 'Traitement...', placeCodOrder: 'Commander en COD', secureNote: 'Les détails de paiement et de livraison sont confirmés avant la création de votre commande.' },
    orders: { loadFailed: 'Impossible de charger les commandes.', status: { pending: 'En attente', processing: 'En préparation', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' }, creditCard: 'Carte bancaire', wallet: 'Portefeuille', unknown: 'Inconnu', invoiceDownloaded: 'Facture téléchargée.', invoiceFailed: 'Impossible de télécharger la facture.', loading: 'Chargement des commandes', emptyTitle: 'Aucune commande pour le moment', emptyLead: 'Après votre première commande, son statut et sa facture apparaîtront ici.', startShopping: 'Découvrir les produits', title: 'Mes commandes', count_one: '{{count}} commande', count_other: '{{count}} commandes', orderId: 'N° de commande', items: 'Articles', statusLabel: 'Statut', date: 'Date', action: 'Action', view: 'Voir' },
  },
  codOps: {
    eyebrow: 'Espace interne de l’équipe', title: 'Centre des opérations COD', lead: 'Coordonnez les remises des vendeurs, le suivi transporteur et les rapports de livraison. La collecte, la commission rifKANDO et les paiements vendeurs restent sous contrôle finance.', refresh: 'Actualiser la file', whatsapp: 'WhatsApp opérations', loading: 'Chargement des opérations COD…', empty: 'Aucune tâche COD dans cette vue.', product: 'Produit', orderItem: 'Article commandé', buyerDestination: 'Acheteur et destination', sellerParcel: 'Vendeur et colis', codTarget: 'Montant COD attendu', buyer: 'Acheteur', seller: 'Vendeur', noPhone: 'Aucun téléphone enregistré', noAddress: 'Adresse non fournie', noSellerNote: 'Aucune note du vendeur', messageBuyer: 'Contacter l’acheteur', messageSeller: 'Contacter le vendeur', codReference: 'Ceci est une référence de livraison. La finance enregistre séparément toute preuve réelle de collecte.', buyerMessage: 'Bonjour {{name}}, voici l’équipe de livraison rifKANDO au sujet de la commande {{order}}. Nous organisons votre livraison COD.', sellerMessage: 'Bonjour {{name}}, Toufiq de la livraison rifKANDO vous contacte au sujet de la commande {{order}}. Merci de confirmer les détails de remise du colis.', filters: { active: 'Travail actif', pickup: 'Collecte demandée', delivery: 'Rapports de livraison', closed: 'Historique' }, stages: { pickupRequested: 'Collecte demandée', waitingHandoff: 'En attente de remise vendeur', reported: 'Signalé : {{outcome}}', inDelivery: 'En livraison', deliveredFollowup: 'Livré, suivi finance' }, outcomes: { delivered: 'livré', refused: 'refusé', returned: 'retourné' }, success: { pickup: 'Collecte et suivi enregistrés.', delivery: 'Résultat de livraison signalé à la finance rifKANDO.' }, errors: { load: 'Impossible de charger le centre des opérations COD.', update: 'La tâche COD n’a pas pu être mise à jour.' },
  },
});

Object.assign(resources.ar.translation, {
  notFound: { title: 'هذه الصفحة غير متاحة', lead: 'قد يكون الرابط غير صحيح أو تم نقل الصفحة. يمكنك العودة بأمان إلى rifKANDO ومتابعة التصفح.', home: 'العودة للرئيسية', products: 'تصفح المنتجات' },
  buyer: {
    items_one: '{{count}} عنصر', items_other: '{{count}} عناصر', seller: 'البائع', orderSummary: 'ملخص الطلب', subtotal: 'المجموع الفرعي', shipping: 'التوصيل', total: 'المجموع', free: 'مجاني', payment: 'الدفع', confirm: 'تأكيد', back: 'رجوع', cashOnDelivery: 'الدفع عند الاستلام',
    cart: { emptyTitle: 'سلة التسوق فارغة', emptyLead: 'لم تضف أي منتجات إلى سلتك بعد.', continueShopping: 'متابعة التسوق', eyebrow: 'سلتك', title: 'سلة التسوق', headingNote: 'راجع منتجاتك قبل إتمام الطلب.', soldBy: 'يباع بواسطة {{seller}}', quantityFor: 'كمية {{title}}', decreaseQuantity: 'تقليل كمية {{title}}', increaseQuantity: 'زيادة كمية {{title}}', lineTotal: 'إجمالي المنتج', removeItem: 'إزالة {{title}} من السلة', shippingNote: 'يحدّد كل بائع التوصيل ثم يتم تأكيده في طلب الدفع عند الاستلام.', continueCheckout: 'متابعة إلى الطلب', secureNote: 'تُراجع تفاصيل التوصيل والدفع عند إتمام الطلب.' },
    checkout: { deliveryDetailsRequired: 'يرجى استكمال بيانات التوصيل قبل المتابعة.', orderPlaced: 'تم إنشاء طلب الدفع عند الاستلام. شكرًا لتسوقك مع rifKANDO!', orderFailed: 'تعذر إنشاء الطلب.', emptyLead: 'أضف منتجات إلى السلة قبل إتمام الطلب.', eyebrow: 'إتمام طلب آمن', title: 'أكمل طلبك', lead: 'راجع تفاصيل التوصيل والدفع قبل إرسال طلبك.', shippingInformation: 'معلومات التوصيل', fullName: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'الهاتف', city: 'المدينة', address: 'العنوان', postalCode: 'الرمز البريدي', orderNotes: 'ملاحظات الطلب (اختياري)', notesPlaceholder: 'تعليمات خاصة للتوصيل...', continuePayment: 'متابعة إلى الدفع', paymentMethod: 'طريقة الدفع', codLead: 'ادفع عندما يصلك طلبك.', reviewOrder: 'مراجعة الطلب', reviewTitle: 'راجع طلبك', shippingAddress: 'عنوان التوصيل', orderItems: 'منتجات الطلب', orderTotal: 'إجمالي الطلب', processing: 'جارٍ المعالجة...', placeCodOrder: 'تأكيد طلب الدفع عند الاستلام', secureNote: 'تُؤكّد تفاصيل الدفع والتوصيل قبل إنشاء طلبك.' },
    orders: { loadFailed: 'تعذر تحميل الطلبات.', status: { pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغى' }, creditCard: 'بطاقة بنكية', wallet: 'المحفظة', unknown: 'غير معروف', invoiceDownloaded: 'تم تنزيل الفاتورة.', invoiceFailed: 'تعذر تنزيل الفاتورة.', loading: 'جارٍ تحميل الطلبات', emptyTitle: 'لا توجد طلبات بعد', emptyLead: 'بعد إتمام طلبك، ستظهر حالته وفاتورته هنا.', startShopping: 'ابدأ التسوق', title: 'طلباتي', count_one: '{{count}} طلب', count_other: '{{count}} طلبات', orderId: 'رقم الطلب', items: 'المنتجات', statusLabel: 'الحالة', date: 'التاريخ', action: 'الإجراء', view: 'عرض' },
  },
  codOps: {
    eyebrow: 'مساحة العمل الداخلية للفريق', title: 'مكتب عمليات الدفع عند الاستلام', lead: 'نسّق استلام البائعين وتتبع شركة التوصيل وتقارير التسليم. يبقى تحصيل النقد وعمولة rifKANDO ومستحقات البائع تحت إدارة المالية.', refresh: 'تحديث قائمة المهام', whatsapp: 'واتساب العمليات', loading: 'جارٍ تحميل عمليات الدفع عند الاستلام…', empty: 'لا توجد مهام دفع عند الاستلام في هذه القائمة.', product: 'منتج', orderItem: 'عنصر الطلب', buyerDestination: 'المشتري والوجهة', sellerParcel: 'البائع والطرد', codTarget: 'مبلغ الدفع عند الاستلام المتوقع', buyer: 'المشتري', seller: 'البائع', noPhone: 'لا يوجد رقم هاتف مسجل', noAddress: 'العنوان غير متوفر', noSellerNote: 'لا توجد ملاحظة من البائع', messageBuyer: 'راسل المشتري', messageSeller: 'راسل البائع', codReference: 'هذه مرجعية للتسليم فقط. تسجّل المالية أدلة تحصيل النقد الفعلية بشكل منفصل.', buyerMessage: 'مرحبًا {{name}}، هذا فريق توصيل rifKANDO بخصوص الطلب {{order}}. نرتب تسليم الدفع عند الاستلام الخاص بك.', sellerMessage: 'مرحبًا {{name}}، أنا توفيق من توصيل rifKANDO بخصوص الطلب {{order}}. يرجى تأكيد تفاصيل تسليم الطرد.', filters: { active: 'مهام نشطة', pickup: 'طلب استلام', delivery: 'تقارير التسليم', closed: 'السجل' }, stages: { pickupRequested: 'تم طلب الاستلام', waitingHandoff: 'في انتظار تسليم البائع', reported: 'تم التبليغ: {{outcome}}', inDelivery: 'قيد التوصيل', deliveredFollowup: 'تم التسليم، متابعة مالية' }, outcomes: { delivered: 'تم التسليم', refused: 'مرفوض', returned: 'مرتجع' }, success: { pickup: 'تم تسجيل الاستلام والتتبع.', delivery: 'تم إرسال نتيجة التسليم إلى مالية rifKANDO.' }, errors: { load: 'تعذر تحميل مكتب عمليات الدفع عند الاستلام.', update: 'تعذر تحديث مهمة الدفع عند الاستلام.' },
  },
});

Object.assign(resources.en.translation.products, {
  price: 'Price', itemPrice: 'Item price', delivery: 'Delivery', freeDelivery: 'Free', codTotal: 'COD total', codBreakdown: 'Cash on delivery total',
  stockAvailable: '{{count}} available', stockLow: 'Only {{count}} left', outOfStock: 'Out of stock', yourListing: 'Your listing', ownListing: 'You cannot buy your own listing.',
  codPayNote: 'Pay {{total}} in cash when your order is delivered.', offerDeliveryNote: 'Agree the final price with the seller before the COD order is created.',
  deliveryCheckoutNote: 'COD Operations confirms the delivery fee after the order is created.', deliveryQuotedAfterOrder: 'Quoted by COD Operations after order', deliveryQuoteBeforePickup: 'rifKANDO COD Operations confirms the delivery fee from the parcel and destination before pickup.', itemPlusDelivery: '{{item}} + delivery', itemPayNote: 'Pay {{item}} for the item on delivery. rifKANDO COD Operations confirms the delivery fee before pickup.', codProtectionNote: 'Review your delivery information before placing the COD order.',
  orderTrackingNote: 'Follow order progress from your account.', purchaseActions: 'Purchase actions', askingPrice: 'Asking price',
});

Object.assign(resources.fr.translation.products, {
  price: 'Prix', itemPrice: 'Prix de l’article', delivery: 'Livraison', freeDelivery: 'Gratuite', codTotal: 'Total à la livraison', codBreakdown: 'Total du paiement à la livraison',
  stockAvailable: '{{count}} disponible(s)', stockLow: 'Plus que {{count}} disponible(s)', outOfStock: 'Rupture de stock', yourListing: 'Votre annonce', ownListing: 'Vous ne pouvez pas acheter votre propre annonce.',
  codPayNote: 'Payez {{total}} en espèces lors de la livraison de votre commande.', offerDeliveryNote: 'Convenez du prix final avec le vendeur avant de créer la commande COD.',
  deliveryCheckoutNote: 'Les opérations COD confirment les frais de livraison après la création de la commande.', deliveryQuotedAfterOrder: 'Déterminée par les opérations COD après la commande', deliveryQuoteBeforePickup: 'Les opérations COD de rifKANDO confirment les frais selon le colis et la destination avant l’enlèvement.', itemPlusDelivery: '{{item}} + livraison', itemPayNote: 'Payez {{item}} pour l’article à la livraison. Les opérations COD de rifKANDO confirment les frais avant l’enlèvement.', codProtectionNote: 'Vérifiez vos informations de livraison avant de passer la commande COD.',
  orderTrackingNote: 'Suivez votre commande depuis votre compte.', purchaseActions: 'Actions d’achat', askingPrice: 'Prix demandé',
});

Object.assign(resources.ar.translation.products, {
  price: 'السعر', itemPrice: 'سعر المنتج', delivery: 'التوصيل', freeDelivery: 'مجاني', codTotal: 'إجمالي الدفع عند الاستلام', codBreakdown: 'تفاصيل إجمالي الدفع عند الاستلام',
  stockAvailable: '{{count}} متاح', stockLow: 'لم يتبق سوى {{count}}', outOfStock: 'غير متوفر حاليًا', yourListing: 'إعلانك', ownListing: 'لا يمكنك شراء إعلانك الخاص.',
  codPayNote: 'ادفع {{total}} نقدًا عند استلام طلبك.', offerDeliveryNote: 'اتفق مع البائع على السعر النهائي قبل إنشاء طلب الدفع عند الاستلام.',
  deliveryCheckoutNote: 'يؤكد فريق عمليات الدفع عند الاستلام رسوم التوصيل بعد إنشاء الطلب.', deliveryQuotedAfterOrder: 'يحددها فريق عمليات الدفع عند الاستلام بعد الطلب', deliveryQuoteBeforePickup: 'يؤكد فريق عمليات rifKANDO رسوم التوصيل حسب الطرد والوجهة قبل الاستلام.', itemPlusDelivery: '{{item}} + التوصيل', itemPayNote: 'ادفع {{item}} ثمن المنتج عند الاستلام. يؤكد فريق عمليات rifKANDO رسوم التوصيل قبل الاستلام.', codProtectionNote: 'راجع بيانات التوصيل قبل تأكيد طلب الدفع عند الاستلام.',
  orderTrackingNote: 'تابع تقدم طلبك من حسابك.', purchaseActions: 'إجراءات الشراء', askingPrice: 'السعر المطلوب',
});

// Shared operational and account labels.  Keep user supplied names, listing titles,
// descriptions, and messages untouched: they are content, not rifKANDO interface copy.
Object.assign(resources.en.translation, {
  notifications: {
    label: 'Notifications', unread: '{{count}} unread', caughtUp: 'You are all caught up', markAllRead: 'Mark all read', loading: 'Loading notifications…', empty: 'Important order, FINDit, and account updates will appear here.', unreadItem: 'Unread notification',
  },
  sellerCod: {
    loading: 'Loading COD orders', eyebrow: 'Cash on delivery', title: 'Delivery and settlement', lead: 'rifKANDO coordinates COD through Toufiq. He collects the parcel, arranges delivery through his network, and remits collected cash to rifKANDO. We retain the 5% commission and send your seller payout manually.', count_one: '{{count}} order', count_other: '{{count}} orders', emptyTitle: 'No COD orders yet', emptyText: 'New Product and FINDit COD orders will appear here.', productOrder: 'Product order', customer: 'Customer', buyerPays: 'Buyer pays on delivery', payout: 'Your payout after 5%', created: 'Created', confirmBy: 'Confirm by {{date}}. Unconfirmed orders expire automatically and do not enter delivery.', saving: 'Saving…', confirmOrder: 'Confirm order', cancelOrder: 'Cancel order', deliveryPartner: 'Delivery partner', contactPartner: 'Contact {{name}} on WhatsApp to agree pickup. He coordinates delivery through {{network}} and confirms tracking with rifKANDO.', openWhatsApp: 'Open WhatsApp', requestPickup: 'I requested pickup', pickupRecorded: 'Pickup request recorded. Wait for Toufiq to collect the parcel and send carrier tracking.', cancelBeforePickup: 'Cancel before pickup', deliveryNetwork: 'Delivery network', tracking: 'Tracking', deadline: 'Toufiq set the buyer arrival deadline: {{date}}.', payoutDue: 'Toufiq’s remittance is recorded. rifKANDO will send your payout of {{amount}} and record the transfer reference here.', payoutPaid: 'Your payout of {{amount}} has been recorded. Reference: {{reference}}.', void: 'This order was not completed, so no seller payout is due.', statuses: { pending_confirmation: 'Needs confirmation', confirmed: 'Pickup coordination', shipped: 'With delivery network', delivered: 'Cash collected', refused: 'Customer refused', returned: 'Returned to seller', cancelled: 'Cancelled' },
  },
  codFinance: {
    loading: 'Loading COD reconciliation…', eyebrow: 'Restricted reconciliation control', title: 'COD reconciliation', controllers: 'Accountable controllers: {{controllers}}', lead: 'Record verified evidence in order: seller handoff, delivery-partner tracking, buyer collection, remittance, then the real seller bank payout. Each financial action is auditable and idempotent.', refresh: 'Refresh', empty: 'There are no COD fulfilments to reconcile.', product: 'Product', orderItem: 'Order item', buyer: 'Buyer', seller: 'Seller', buyerPays: 'Buyer pays', deliveryFee: 'Delivery fee', commission: 'rifKANDO commission', sellerPayout: 'Seller payout', carrier: 'Carrier', tracking: 'Tracking', notRecorded: 'Not recorded', selectCarrier: 'Select carrier', other: 'Other', carrierName: 'Carrier name', actualCarrierName: 'Actual carrier name', trackingNumber: 'Tracking number', pickupNote: 'Pickup note', optionalHandoffEvidence: 'Optional handoff evidence', confirmPickup: 'Confirm pickup', recording: 'Recording…', collectionReference: 'Collection reference', carrierOrReceiptReference: 'Carrier or receipt reference', collectedMad: 'Collected MAD', note: 'Note', optionalDeliveryProof: 'Optional delivery proof', recordCollection: 'Record collection', remittanceReference: 'Remittance reference', cashOrBankReference: 'Cash receipt or bank reference', receivedMad: 'Received MAD', optionalReconciliationNote: 'Optional reconciliation note', recordRemittance: 'Record remittance', sellerTransferReference: 'Seller transfer reference', attijariTransferReference: 'Attijari transfer reference', optionalPayoutNote: 'Optional payout note', recordPayout: 'Record seller payout', exceptionNote: 'Carrier exception note', recordException: 'Record exception',
  },
  operationsTeam: {
    eyebrow: 'Internal access', title: 'COD Operations Team', lead: 'Give a dedicated rifKANDO account access to parcel coordination only. Operations members can view delivery tasks, record pickup and field reports, and contact the buyer or seller. They cannot see bank details, verify commission, record cash, or release a seller payout.', addTitle: 'Add a team member', addLead: 'Toufiq must first create a normal rifKANDO account with this email. Use a separate buyer account, not a seller, finance, or administrator account.', email: 'rifKANDO account email', grant: 'Grant access', adding: 'Adding…', currentTitle: 'Current operations members', currentLead: 'Each change is recorded in the administrative audit log.', refresh: 'Refresh', loading: 'Loading team…', empty: 'No operations accounts have been added yet.', teamMember: 'rifKANDO team member', accessSince: 'Operations access since {{date}}', remove: 'Remove access', removing: 'Removing…', safety: 'Safe use:', safetyText: 'remove access immediately if a team member stops working with rifKANDO. Finance reconciliation stays in the separate COD Reconciliation page under your control.',
  },
});

Object.assign(resources.ar.translation, {
  notifications: {
    label: 'الإشعارات', unread: '{{count}} غير مقروء', caughtUp: 'اطّلعت على كل الإشعارات', markAllRead: 'تحديد الكل كمقروء', loading: 'جارٍ تحميل الإشعارات…', empty: 'ستظهر هنا تحديثات مهمة عن الطلبات وFINDit والحساب.', unreadItem: 'إشعار غير مقروء',
  },
  sellerCod: {
    loading: 'جارٍ تحميل طلبات الدفع عند الاستلام', eyebrow: 'الدفع عند الاستلام', title: 'التوصيل والتسوية', lead: 'تنسّق rifKANDO عمليات الدفع عند الاستلام عبر توفيق. يستلم الطرد وينظم التوصيل عبر شبكته ويسلّم المبالغ المحصلة إلى rifKANDO. نحتفظ بعمولة 5% ونرسل مستحقات البائع يدويًا.', count_one: '{{count}} طلب', count_other: '{{count}} طلبات', emptyTitle: 'لا توجد طلبات دفع عند الاستلام بعد', emptyText: 'ستظهر هنا طلبات المنتجات وFINDit بالدفع عند الاستلام.', productOrder: 'طلب منتج', customer: 'العميل', buyerPays: 'يدفع المشتري عند الاستلام', payout: 'مستحقاتك بعد 5%', created: 'تاريخ الإنشاء', confirmBy: 'أكّد قبل {{date}}. تنتهي الطلبات غير المؤكدة تلقائيًا ولا تدخل مسار التوصيل.', saving: 'جارٍ الحفظ…', confirmOrder: 'تأكيد الطلب', cancelOrder: 'إلغاء الطلب', deliveryPartner: 'شريك التوصيل', contactPartner: 'تواصل مع {{name}} عبر واتساب للاتفاق على الاستلام. ينسّق التوصيل عبر {{network}} ويؤكد التتبع مع rifKANDO.', openWhatsApp: 'فتح واتساب', requestPickup: 'طلبت الاستلام', pickupRecorded: 'تم تسجيل طلب الاستلام. انتظر توفيق ليستلم الطرد ويرسل رقم التتبع.', cancelBeforePickup: 'إلغاء قبل الاستلام', deliveryNetwork: 'شبكة التوصيل', tracking: 'التتبع', deadline: 'حدّد توفيق موعد وصول المشتري: {{date}}.', payoutDue: 'تم تسجيل تحويل توفيق. سترسل rifKANDO مستحقاتك البالغة {{amount}} وتوثق مرجع التحويل هنا.', payoutPaid: 'تم تسجيل مستحقاتك البالغة {{amount}}. المرجع: {{reference}}.', void: 'لم يكتمل هذا الطلب، لذلك لا توجد مستحقات للبائع.', statuses: { pending_confirmation: 'بانتظار التأكيد', confirmed: 'تنسيق الاستلام', shipped: 'مع شبكة التوصيل', delivered: 'تم تحصيل المبلغ', refused: 'رفض العميل', returned: 'تم الإرجاع للبائع', cancelled: 'ملغى' },
  },
  codFinance: {
    loading: 'جارٍ تحميل تسوية الدفع عند الاستلام…', eyebrow: 'تحكم محدود للتسوية', title: 'تسوية الدفع عند الاستلام', controllers: 'المسؤولون عن التحكم: {{controllers}}', lead: 'سجّل الأدلة الموثقة بالترتيب: تسليم البائع، تتبع شريك التوصيل، تحصيل المشتري، التحويل إلى rifKANDO، ثم تحويل مستحقات البائع. كل إجراء مالي قابل للتدقيق ولا يتكرر.', refresh: 'تحديث', empty: 'لا توجد عمليات دفع عند الاستلام تحتاج إلى تسوية.', product: 'منتج', orderItem: 'عنصر الطلب', buyer: 'المشتري', seller: 'البائع', buyerPays: 'ما يدفعه المشتري', deliveryFee: 'رسوم التوصيل', commission: 'عمولة rifKANDO', sellerPayout: 'مستحقات البائع', carrier: 'شركة التوصيل', tracking: 'التتبع', notRecorded: 'غير مسجل', selectCarrier: 'اختر شركة التوصيل', other: 'أخرى', carrierName: 'اسم شركة التوصيل', actualCarrierName: 'الاسم الفعلي لشركة التوصيل', trackingNumber: 'رقم التتبع', pickupNote: 'ملاحظة الاستلام', optionalHandoffEvidence: 'دليل تسليم اختياري', confirmPickup: 'تأكيد الاستلام', recording: 'جارٍ التسجيل…', collectionReference: 'مرجع التحصيل', carrierOrReceiptReference: 'مرجع شركة التوصيل أو الإيصال', collectedMad: 'المبلغ المحصل بالدرهم', note: 'ملاحظة', optionalDeliveryProof: 'دليل تسليم اختياري', recordCollection: 'تسجيل التحصيل', remittanceReference: 'مرجع التحويل', cashOrBankReference: 'مرجع إيصال نقدي أو بنكي', receivedMad: 'المبلغ المستلم بالدرهم', optionalReconciliationNote: 'ملاحظة تسوية اختيارية', recordRemittance: 'تسجيل التحويل', sellerTransferReference: 'مرجع تحويل البائع', attijariTransferReference: 'مرجع تحويل التجاري وفا بنك', optionalPayoutNote: 'ملاحظة مستحقات اختيارية', recordPayout: 'تسجيل مستحقات البائع', exceptionNote: 'ملاحظة استثناء شركة التوصيل', recordException: 'تسجيل الاستثناء',
  },
  operationsTeam: {
    eyebrow: 'وصول داخلي', title: 'فريق عمليات الدفع عند الاستلام', lead: 'امنح حساب rifKANDO مخصصًا وصولًا لتنسيق الطرود فقط. يستطيع أعضاء العمليات رؤية مهام التوصيل وتسجيل الاستلام والتقارير الميدانية والتواصل مع المشتري أو البائع. لا يمكنهم رؤية بيانات البنك أو التحقق من العمولة أو تسجيل النقد أو صرف مستحقات البائع.', addTitle: 'إضافة عضو للفريق', addLead: 'يجب أن ينشئ توفيق أولًا حساب rifKANDO عاديًا بهذا البريد الإلكتروني. استخدم حساب مشترٍ مستقل، وليس حساب بائع أو مالية أو مدير.', email: 'بريد حساب rifKANDO', grant: 'منح الوصول', adding: 'جارٍ الإضافة…', currentTitle: 'أعضاء العمليات الحاليون', currentLead: 'يتم تسجيل كل تغيير في سجل التدقيق الإداري.', refresh: 'تحديث', loading: 'جارٍ تحميل الفريق…', empty: 'لم تتم إضافة أي حسابات للعمليات بعد.', teamMember: 'عضو فريق rifKANDO', accessSince: 'وصول العمليات منذ {{date}}', remove: 'إزالة الوصول', removing: 'جارٍ الإزالة…', safety: 'استخدام آمن:', safetyText: 'أزل الوصول فورًا إذا توقف عضو في الفريق عن العمل مع rifKANDO. تبقى التسوية المالية في صفحة تسوية الدفع عند الاستلام المنفصلة وتحت تحكمك.',
  },
});

Object.assign(resources.en.translation.sellerCod, {
  loadFailed: 'Unable to load orders.', updateFailed: 'The COD order could not be updated.', updatedSuccess: 'COD order updated.', confirmedSuccess: 'COD order confirmed. You can now arrange pickup.', cancelledSuccess: 'COD order cancelled.', legacy: 'This older order uses the previous seller-managed commission flow. Contact rifKANDO support for settlement.',
  whatsAppMessage: 'Hello {{name}}, I am the seller for rifKANDO COD order {{order}}. The parcel ({{item}}) is ready for pickup. Please confirm the handoff details and carrier tracking with me.',
});
Object.assign(resources.en.translation.products, { notSpecified: 'Not specified' });
Object.assign(resources.ar.translation.products, { notSpecified: 'غير محدد' });
Object.assign(resources.en.translation, {
  mediaUploader: { upTo: 'You can add up to {{count}} files. Remove an item before adding more.', unsupported: '{{name}} is not a supported photo or video.', tooLarge: '{{name}} exceeds the {{size}} MB {{type}} limit.', failed: 'Failed to upload {{name}}', uploaded_one: '{{count}} file uploaded.', uploaded_other: '{{count}} files uploaded.', upload: 'Add media', uploading: 'Uploading{{progress}}', cover: 'Cover', remove: 'Remove media {{count}}', controls: 'Media {{count}} ordering controls', makeCover: 'Make media {{count}} the cover', moveEarlier: 'Move media {{count}} earlier', moveLater: 'Move media {{count}} later', help: 'The first item is your cover. Reorder with the arrows or use the star to choose a new cover. Add up to {{count}} {{kind}}.', photos: 'photos', photosVideos: 'photos or videos (MP4, MOV, M4V, or WebM; videos up to 90 MB)' },
  gallery: { close: 'Close gallery', previous: 'Previous image', next: 'Next image', image: 'Gallery image', thumbnail: 'Gallery thumbnail' },
});
Object.assign(resources.ar.translation, {
  mediaUploader: { upTo: 'يمكنك إضافة ما يصل إلى {{count}} ملفات. أزل عنصرًا قبل إضافة المزيد.', unsupported: '{{name}} ليس صورة أو فيديو مدعومًا.', tooLarge: '{{name}} يتجاوز حد {{size}} ميغابايت لنوع {{type}}.', failed: 'تعذر رفع {{name}}', uploaded_one: 'تم رفع ملف واحد.', uploaded_other: 'تم رفع {{count}} ملفات.', upload: 'أضف وسائط', uploading: 'جارٍ الرفع{{progress}}', cover: 'الغلاف', remove: 'إزالة الوسيط {{count}}', controls: 'عناصر ترتيب الوسيط {{count}}', makeCover: 'اجعل الوسيط {{count}} غلافًا', moveEarlier: 'نقل الوسيط {{count}} إلى السابق', moveLater: 'نقل الوسيط {{count}} إلى التالي', help: 'العنصر الأول هو الغلاف. أعد الترتيب بالأسهم أو استخدم النجمة لاختيار غلاف جديد. أضف حتى {{count}} {{kind}}.', photos: 'صور', photosVideos: 'صور أو فيديوهات MP4 أو MOV أو M4V أو WebM، بحد أقصى 90 ميغابايت للفيديو' },
  gallery: { close: 'إغلاق المعرض', previous: 'الصورة السابقة', next: 'الصورة التالية', image: 'صورة المعرض', thumbnail: 'صورة مصغرة للمعرض' },
});
Object.assign(resources.ar.translation.sellerCod, {
  loadFailed: 'تعذر تحميل الطلبات.', updateFailed: 'تعذر تحديث طلب الدفع عند الاستلام.', updatedSuccess: 'تم تحديث طلب الدفع عند الاستلام.', confirmedSuccess: 'تم تأكيد طلب الدفع عند الاستلام. يمكنك الآن ترتيب الاستلام.', cancelledSuccess: 'تم إلغاء طلب الدفع عند الاستلام.', legacy: 'يستخدم هذا الطلب القديم مسار العمولة السابق الذي يديره البائع. تواصل مع دعم rifKANDO لإتمام التسوية.',
  whatsAppMessage: 'مرحبًا {{name}}، أنا البائع في طلب rifKANDO للدفع عند الاستلام رقم {{order}}. الطرد ({{item}}) جاهز للاستلام. يرجى تأكيد تفاصيل التسليم وتتبع شركة التوصيل معي.',
});

Object.assign(resources.en.translation.productDetails, {
  openGallery: 'Open media gallery for {{title}}', showMedia: 'Show media {{count}} for {{title}}', soldBy: 'Sold by', selectQuantity: 'Select quantity', favoriteAdd: 'Add to favorites', favoriteRemove: 'Remove from favorites', productInformation: 'Product information', noDescription: 'The seller has not added a description yet.',
});
Object.assign(resources.ar.translation.productDetails, {
  openGallery: 'فتح معرض الوسائط لـ {{title}}', showMedia: 'عرض الوسيط {{count}} لـ {{title}}', soldBy: 'يباع بواسطة', selectQuantity: 'اختر الكمية', favoriteAdd: 'أضف إلى المفضلة', favoriteRemove: 'أزل من المفضلة', productInformation: 'معلومات المنتج', noDescription: 'لم يضف البائع وصفًا لهذا المنتج بعد.',
});

Object.assign(resources.en.translation.productDetails.review, {
  verifiedPurchase: 'Verified delivery',
});
Object.assign(resources.ar.translation.productDetails.review, {
  verifiedPurchase: 'تسليم موثّق',
});

Object.assign(resources.en.translation, {
  storefront: {
    loading: 'Loading seller storefront…', notFound: 'This seller storefront is not available', loadFailed: 'We could not load this storefront', errorLead: 'Try again in a moment or continue browsing active marketplace listings.', backToProducts: 'Back to products', eyebrow: 'rifKANDO seller storefront', sellingSince: 'Selling since {{date}}', reputationLabel: 'Seller reputation', reviews_one: '{{count}} verified review', reviews_other: '{{count}} verified reviews', activeListings: 'active listings', listingsEyebrow: 'Available now', listingsTitle: '{{name}}’s listings', listingCount_one: '{{count}} listing', listingCount_other: '{{count}} listings', emptyTitle: 'No active listings right now', emptyLead: 'This seller has no products available at the moment. Explore other products on rifKANDO.', browseProducts: 'Browse products', loadMore: 'Load more listings', loadingMore: 'Loading listings…',
  },
});
Object.assign(resources.fr.translation, {
  storefront: {
    loading: 'Chargement de la vitrine…', notFound: 'Cette vitrine vendeur n’est pas disponible', loadFailed: 'Impossible de charger cette vitrine', errorLead: 'Réessayez dans un instant ou continuez à parcourir les annonces actives.', backToProducts: 'Retour aux produits', eyebrow: 'Vitrine vendeur rifKANDO', sellingSince: 'Vendeur depuis {{date}}', reputationLabel: 'Réputation du vendeur', reviews_one: '{{count}} avis vérifié', reviews_other: '{{count}} avis vérifiés', activeListings: 'annonces actives', listingsEyebrow: 'Disponible maintenant', listingsTitle: 'Annonces de {{name}}', listingCount_one: '{{count}} annonce', listingCount_other: '{{count}} annonces', emptyTitle: 'Aucune annonce active pour le moment', emptyLead: 'Ce vendeur n’a pas de produit disponible pour le moment. Découvrez les autres produits sur rifKANDO.', browseProducts: 'Voir les produits', loadMore: 'Voir plus d’annonces', loadingMore: 'Chargement des annonces…',
  },
});
Object.assign(resources.ar.translation, {
  storefront: {
    loading: 'جارٍ تحميل واجهة البائع…', notFound: 'واجهة هذا البائع غير متاحة', loadFailed: 'تعذر تحميل واجهة البائع', errorLead: 'حاول مرة أخرى بعد لحظات أو واصل تصفح الإعلانات النشطة.', backToProducts: 'العودة إلى المنتجات', eyebrow: 'واجهة بائع rifKANDO', sellingSince: 'يبيع منذ {{date}}', reputationLabel: 'سمعة البائع', reviews_one: '{{count}} مراجعة موثّقة', reviews_other: '{{count}} مراجعة موثّقة', activeListings: 'إعلانات نشطة', listingsEyebrow: 'متاح الآن', listingsTitle: 'إعلانات {{name}}', listingCount_one: '{{count}} إعلان', listingCount_other: '{{count}} إعلانات', emptyTitle: 'لا توجد إعلانات نشطة حاليًا', emptyLead: 'لا يملك هذا البائع منتجات متاحة الآن. اكتشف منتجات أخرى على rifKANDO.', browseProducts: 'تصفح المنتجات', loadMore: 'تحميل مزيد من الإعلانات', loadingMore: 'جارٍ تحميل الإعلانات…',
  },
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
