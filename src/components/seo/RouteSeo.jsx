import { useLocation } from 'react-router-dom';
import SeoHead from './SeoHead';
import { SEO_ORIGIN } from './seoConfig';

const publicPages = {
  '/': {
    title: 'rifKANDO | Products and FINDit from Morocco',
    description: 'Discover products, local sellers, and FINDit requests on rifKANDO, built from Morocco for the world.',
  },
  '/products': {
    title: 'Products in Morocco | New, Used as New and Joutiya | rifKANDO',
    description: 'Browse new products, used-as-new finds, and Joutiya listings in Morocco. Compare sellers and pay by cash on delivery.',
  },
  '/findit': {
    title: 'FINDit | Ask Sellers to Find What You Need in Morocco | rifKANDO',
    description: 'Describe the product you need once. Sellers send matching solutions privately through rifKANDO FINDit.',
  },
  '/seller-guidelines': {
    title: 'Seller Guidelines | rifKANDO',
    description: 'Learn rifKANDO seller standards, product rules, COD fulfilment expectations, and marketplace fees.',
  },
  '/pricing': {
    title: 'Seller Fees and Pricing | rifKANDO',
    description: 'Understand rifKANDO marketplace fees for product and FINDit sellers.',
  },
  '/help': {
    title: 'Help Center | rifKANDO',
    description: 'Find answers about buying, selling, COD delivery, and FINDit on rifKANDO.',
  },
  '/contact': {
    title: 'Contact rifKANDO Support',
    description: 'Contact rifKANDO for marketplace, seller, buyer, or COD support.',
  },
  '/terms': {
    title: 'Terms of Service | rifKANDO',
    description: 'Read the rifKANDO terms of service for buyers, sellers, and marketplace use.',
  },
  '/privacy': {
    title: 'Privacy Policy | rifKANDO',
    description: 'Read how rifKANDO handles privacy, account information, and marketplace data.',
  },
};

const privatePrefixes = [
  '/admin', '/cart', '/checkout', '/findit/dashboard', '/login', '/messages',
  '/operations', '/orders', '/payment', '/register', '/seller', '/settings', '/favorites',
];

const RouteSeo = () => {
  const { pathname } = useLocation();
  const publicPage = publicPages[pathname];
  const isPrivate = privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const homepageSchema = pathname === '/' ? [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'rifKANDO',
      url: SEO_ORIGIN,
      logo: `${SEO_ORIGIN}/rifkando-app-icon-512.png`,
      description: publicPages['/'].description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'rifKANDO',
      url: SEO_ORIGIN,
    },
  ] : undefined;

  return <SeoHead
    path={pathname}
    title={publicPage?.title || 'rifKANDO | Marketplace from Morocco'}
    description={publicPage?.description || 'Discover products and FINDit requests on rifKANDO.'}
    noIndex={!publicPage && isPrivate}
    jsonLd={homepageSchema}
  />;
};

export default RouteSeo;
