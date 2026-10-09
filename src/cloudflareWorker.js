/* global HTMLRewriter */

const CANONICAL_ORIGIN = 'https://www.rifkando.com';
const API_ORIGIN = 'https://api.rifkando.com/api';
const PUBLIC_CATALOG_SNAPSHOT_URL = 'https://media.rifkando.com/public/catalog/latest.json';
const SERVICE_WORKER_RECOVERY_COOKIE = 'rifkando_sw_recovery=1';
const DEFAULT_IMAGE = `${CANONICAL_ORIGIN}/rifkando-app-icon-512.png`;

const PRIVATE_PATH_PREFIXES = [
  '/admin', '/cart', '/checkout', '/favorites', '/findit/dashboard', '/login',
  '/messages', '/operations', '/orders', '/payment', '/register', '/seller', '/settings',
];

const STATIC_SITEMAP_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/products', changefreq: 'hourly', priority: '0.9' },
  { path: '/findit', changefreq: 'hourly', priority: '0.9' },
  { path: '/seller-guidelines', changefreq: 'monthly', priority: '0.5' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.5' },
  { path: '/help', changefreq: 'monthly', priority: '0.4' },
  { path: '/contact', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms', changefreq: 'monthly', priority: '0.2' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.2' },
];

const PUBLIC_PAGE_METADATA = {
  '/': { title: 'rifKANDO | Products and FINDit from Morocco', description: 'Discover products, local sellers, and FINDit requests on rifKANDO, built from Morocco for the world.' },
  '/products': { title: 'Products in Morocco | New, Used as New and Joutiya | rifKANDO', description: 'Browse new products, used-as-new finds, and Joutiya listings in Morocco. Compare sellers and pay by cash on delivery.' },
  '/findit': { title: 'FINDit | Ask Sellers to Find What You Need in Morocco | rifKANDO', description: 'Describe the product you need once. Sellers send matching solutions privately through rifKANDO FINDit.' },
  '/seller-guidelines': { title: 'Seller Guidelines | rifKANDO', description: 'Learn rifKANDO seller standards, product rules, COD fulfilment expectations, and marketplace fees.' },
  '/pricing': { title: 'Seller Fees and Pricing | rifKANDO', description: 'Understand rifKANDO marketplace fees for product and FINDit sellers.' },
  '/help': { title: 'Help Center | rifKANDO', description: 'Find answers about buying, selling, COD delivery, and FINDit on rifKANDO.' },
  '/contact': { title: 'Contact rifKANDO Support', description: 'Contact rifKANDO for marketplace, seller, buyer, or COD support.' },
  '/terms': { title: 'Terms of Service | rifKANDO', description: 'Read the rifKANDO terms of service for buyers, sellers, and marketplace use.' },
  '/privacy': { title: 'Privacy Policy | rifKANDO', description: 'Read how rifKANDO handles privacy, account information, and marketplace data.' },
};

const normalisePath = (path = '/') => (path === '/' ? '/' : path.replace(/\/+$/, ''));
const isPrivatePath = (path) => PRIVATE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
const isHtmlNavigation = (request) => request.method === 'GET' && request.headers.get('accept')?.includes('text/html');
const isSafeId = (value) => /^[1-9]\d*$/.test(String(value));
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const absoluteMediaUrl = (value) => {
  if (!value) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://api.rifkando.com${value.startsWith('/') ? '' : '/'}${value}`;
};

const getJson = async (url, timeoutMs = 3500) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const getPageMetadata = async (path) => {
  const staticMetadata = PUBLIC_PAGE_METADATA[path];
  if (staticMetadata) {
    const schema = path === '/' ? [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'rifKANDO', url: CANONICAL_ORIGIN, logo: DEFAULT_IMAGE, description: staticMetadata.description },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'rifKANDO', url: CANONICAL_ORIGIN },
    ] : undefined;
    return { ...staticMetadata, image: DEFAULT_IMAGE, type: 'website', schema };
  }

  const productMatch = path.match(/^\/product\/([1-9]\d*)$/);
  if (productMatch) {
    const payload = await getJson(`${API_ORIGIN}/products/${productMatch[1]}`);
    const product = payload?.product;
    if (product) {
      const image = absoluteMediaUrl(product.media?.find((item) => item.media_type !== 'video')?.media_url || product.image);
      const price = Number(product.price ?? ((Number(product.price_minor) || 0) / 100));
      const description = String(product.description || `${product.title} available on rifKANDO.`).slice(0, 160);
      return {
        title: `${product.title} | rifKANDO`, description, image, type: 'product',
        schema: [{
          '@context': 'https://schema.org', '@type': 'Product', name: product.title, description, image: [image],
          offers: {
            '@type': 'Offer', priceCurrency: 'MAD', price: String(price),
            availability: Number(product.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${CANONICAL_ORIGIN}${path}`,
          },
        }],
      };
    }
  }

  const profileMatch = path.match(/^\/profile\/([1-9]\d*)$/);
  if (profileMatch) {
    const payload = await getJson(`${API_ORIGIN}/sellers/${profileMatch[1]}/storefront`);
    const seller = payload?.seller;
    if (seller) {
      const image = absoluteMediaUrl(seller.profilePicture);
      const description = String(seller.bio || `${seller.name} sells products on rifKANDO.`).replace(/\s+/g, ' ').trim().slice(0, 160);
      const reviewCount = Number(seller.reviewCount || 0);
      const person = {
        '@type': 'Person', name: seller.name, image,
        ...(seller.city || seller.country ? { address: { '@type': 'PostalAddress', addressLocality: seller.city || undefined, addressCountry: seller.country || 'Morocco' } } : {}),
        ...(reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(seller.averageRating || 0).toFixed(1), reviewCount } } : {}),
      };
      return {
        title: `${seller.name} | rifKANDO Seller Storefront`, description, image, type: 'profile',
        schema: [{ '@context': 'https://schema.org', '@type': 'ProfilePage', name: `${seller.name} | rifKANDO seller storefront`, description, url: `${CANONICAL_ORIGIN}${path}`, mainEntity: person }],
      };
    }
  }
  return { title: 'rifKANDO | Marketplace from Morocco', description: 'Discover products and FINDit requests on rifKANDO.', image: DEFAULT_IMAGE, type: 'website' };
};

const withCrawlerHeaders = (path, response) => {
  if (!isPrivatePath(path)) return response;
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
};

const applySeo = async (request, response, path) => {
  const contentType = response.headers.get('content-type') || '';
  if (!isHtmlNavigation(request) || !contentType.includes('text/html') || typeof HTMLRewriter !== 'function') return withCrawlerHeaders(path, response);

  const metadata = await getPageMetadata(path);
  const canonical = `${CANONICAL_ORIGIN}${path}`;
  const robots = isPrivatePath(path) ? 'noindex,follow' : 'index,follow,max-image-preview:large';
  const schema = metadata.schema?.length ? `<script type="application/ld+json">${JSON.stringify(metadata.schema).replace(/</g, '\\u003c')}</script>` : '';
  const headMarkup = [
    `<meta name="robots" content="${robots}">`, `<meta property="og:title" content="${escapeHtml(metadata.title)}">`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}">`, `<meta property="og:type" content="${metadata.type}">`,
    `<meta property="og:url" content="${canonical}">`, `<meta property="og:image" content="${escapeHtml(metadata.image)}">`,
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${escapeHtml(metadata.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}">`, `<meta name="twitter:image" content="${escapeHtml(metadata.image)}">`, schema,
  ].join('');

  const rewritten = new HTMLRewriter()
    .on('title', { element: (element) => element.setInnerContent(metadata.title) })
    .on('meta[name="description"]', { element: (element) => element.setAttribute('content', metadata.description) })
    .on('link[rel="canonical"]', { element: (element) => element.setAttribute('href', canonical) })
    .on('meta[property="og:url"]', { element: (element) => element.setAttribute('content', canonical) })
    .on('head', { element: (element) => element.append(headMarkup, { html: true }) })
    .transform(response);
  return withCrawlerHeaders(path, rewritten);
};

const applyServiceWorkerRecovery = (request, response) => {
  const alreadyRecovered = request.headers.get('cookie')?.includes(SERVICE_WORKER_RECOVERY_COOKIE);
  if (!isHtmlNavigation(request) || alreadyRecovered) return response;
  const headers = new Headers(response.headers);
  headers.set('Clear-Site-Data', '"storage"');
  headers.append('Set-Cookie', `${SERVICE_WORKER_RECOVERY_COOKIE}; Max-Age=604800; Path=/; Secure; SameSite=Lax`);
  return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
};

const catalogSnapshotResponse = async (request) => {
  try {
    const upstream = await fetch(PUBLIC_CATALOG_SNAPSHOT_URL, { headers: { Accept: 'application/json' } });
    const headers = new Headers(upstream.headers);
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(request.method === 'HEAD' ? null : upstream.body, { headers, status: upstream.status, statusText: upstream.statusText });
  } catch {
    return new Response(JSON.stringify({ error: 'Catalog snapshot is temporarily unavailable.' }), { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }, status: 503 });
  }
};

const dynamicSitemapEntries = async () => {
  const payload = await getJson(`${API_ORIGIN}/products?sortBy=newest&page=1&limit=100`, 5000);
  return (Array.isArray(payload?.products) ? payload.products : [])
    .filter((product) => isSafeId(product?.id))
    .map((product) => {
      const timestamp = Date.parse(product.updated_at || product.created_at || '');
      return { path: `/product/${product.id}`, lastmod: Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString().slice(0, 10), changefreq: 'weekly', priority: '0.8' };
    });
};

const sitemapResponse = async (request) => {
  const entries = [...STATIC_SITEMAP_PAGES, ...await dynamicSitemapEntries()];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${escapeHtml(`${CANONICAL_ORIGIN}${entry.path}`)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}<changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`).join('')}</urlset>`;
  return new Response(request.method === 'HEAD' ? null : body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=900', 'X-Content-Type-Options': 'nosniff' } });
};

// Serve the React shell only for browser page navigations. Returning index.html
// for every unknown URL makes a missing JavaScript asset look like a valid 200
// HTML response, which causes a blank screen after deployments.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'rifkando.com') {
      url.protocol = 'https:';
      url.hostname = 'www.rifkando.com';
      return Response.redirect(url.toString(), 301);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/catalog/latest.json') return catalogSnapshotResponse(request);
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/sitemap.xml') return sitemapResponse(request);

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return applyServiceWorkerRecovery(request, await applySeo(request, assetResponse, normalisePath(url.pathname)));
    if (isHtmlNavigation(request)) {
      url.pathname = '/index.html';
      url.search = '';
      const appShell = await env.ASSETS.fetch(new Request(url, request));
      return applyServiceWorkerRecovery(request, await applySeo(request, appShell, normalisePath(new URL(request.url).pathname)));
    }
    return assetResponse;
  },
};
