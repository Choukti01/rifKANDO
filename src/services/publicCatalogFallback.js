const CACHE_KEY = 'rifkando.public-catalog.snapshot.v1';
const RESPONSE_CACHE_PREFIX = 'rifkando.public-catalog.response.v1:';
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_SNAPSHOT_URL = import.meta.env.VITE_PUBLIC_CATALOG_SNAPSHOT_URL?.trim()
  // Same-origin Worker proxy keeps the R2 bucket credentials least-privileged
  // while allowing browsers to read the public snapshot without cross-origin CORS.
  || (import.meta.env.PROD ? '/catalog/latest.json' : '');

const cacheablePath = (pathname) => pathname === '/products'
  || /^\/products\/\d+$/.test(pathname)
  || pathname === '/findit/requests'
  || /^\/findit\/requests\/\d+$/.test(pathname);

const safeStorage = {
  get(key) {
    try { return JSON.parse(window.localStorage.getItem(key) || 'null'); } catch { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
  },
};

const requestUrl = (config = {}) => {
  const url = new URL(String(config.url || '/'), 'https://rifkando.invalid/api');
  Object.entries(config.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url;
};

const cacheKeyFor = (config) => `${RESPONSE_CACHE_PREFIX}${requestUrl(config).pathname}${requestUrl(config).search}`;

const validSnapshot = (value) => value
  && value.schemaVersion === 1
  && Array.isArray(value.products)
  && Array.isArray(value.finditRequests);

const readFresh = (key) => {
  const entry = safeStorage.get(key);
  if (!entry || !entry.savedAt || Date.now() - entry.savedAt > MAX_CACHE_AGE_MS) return null;
  return entry.value || null;
};

export const isPublicCatalogRequest = (config = {}) => String(config.method || 'get').toLowerCase() === 'get'
  && cacheablePath(requestUrl(config).pathname);

export const cachePublicCatalogResponse = (config, data) => {
  if (!isPublicCatalogRequest(config)) return;
  safeStorage.set(cacheKeyFor(config), { savedAt: Date.now(), value: data });
};

const snapshotFromCacheOrNetwork = async () => {
  const cached = readFresh(CACHE_KEY);
  if (cached && validSnapshot(cached)) return cached;
  if (!FALLBACK_SNAPSHOT_URL) return null;

  try {
    const response = await fetch(FALLBACK_SNAPSHOT_URL, { cache: 'no-cache', signal: AbortSignal.timeout(4_000) });
    if (!response.ok) return null;
    const snapshot = await response.json();
    if (!validSnapshot(snapshot)) return null;
    safeStorage.set(CACHE_KEY, { savedAt: Date.now(), value: snapshot });
    return snapshot;
  } catch {
    return null;
  }
};

const asPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const productResponse = (snapshot, url) => {
  const idMatch = url.pathname.match(/^\/products\/(\d+)$/);
  if (idMatch) {
    const product = snapshot.products.find((item) => Number(item.id) === Number(idMatch[1]));
    return product ? { success: true, product } : null;
  }

  const condition = url.searchParams.get('condition') || '';
  const category = url.searchParams.get('category') || '';
  const city = (url.searchParams.get('city') || '').trim().toLocaleLowerCase();
  const search = (url.searchParams.get('search') || '').trim().toLocaleLowerCase();
  const minPrice = Number(url.searchParams.get('minPrice'));
  const maxPrice = Number(url.searchParams.get('maxPrice'));
  const sortBy = url.searchParams.get('sortBy') || 'newest';
  const page = asPositiveInteger(url.searchParams.get('page'), 1);
  const limit = Math.min(asPositiveInteger(url.searchParams.get('limit'), 20), 100);
  let products = snapshot.products.filter((product) => {
    if (condition && product.condition !== condition) return false;
    if (category && product.category !== category) return false;
    if (city && String(product.origin_city || product.listing_city || product.city || '').trim().toLocaleLowerCase() !== city) return false;
    if (search && !`${product.title || ''} ${product.description || ''}`.toLocaleLowerCase().includes(search)) return false;
    if (Number.isFinite(minPrice) && Number(product.price) < minPrice) return false;
    if (Number.isFinite(maxPrice) && Number(product.price) > maxPrice) return false;
    return true;
  });
  const compare = {
    price_asc: (left, right) => Number(left.price) - Number(right.price),
    price_desc: (left, right) => Number(right.price) - Number(left.price),
    rating: (left, right) => Number(right.rating) - Number(left.rating),
    popular: (left, right) => Number(right.sold) - Number(left.sold),
  }[sortBy] || ((left, right) => Date.parse(right.created_at || 0) - Date.parse(left.created_at || 0));
  products = [...products].sort(compare);
  const total = products.length;
  return {
    success: true,
    products: products.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    snapshotGeneratedAt: snapshot.generatedAt,
    snapshotTruncated: Boolean(snapshot.productsTruncated),
  };
};

const finditResponse = (snapshot, url) => {
  const idMatch = url.pathname.match(/^\/findit\/requests\/(\d+)$/);
  if (idMatch) {
    const request = snapshot.finditRequests.find((item) => Number(item.id) === Number(idMatch[1]));
    return request ? { success: true, request } : null;
  }
  const page = asPositiveInteger(url.searchParams.get('page'), 1);
  const limit = Math.min(asPositiveInteger(url.searchParams.get('limit'), 24), 100);
  const search = (url.searchParams.get('search') || '').trim().toLocaleLowerCase();
  const category = url.searchParams.get('category') || '';
  const city = (url.searchParams.get('city') || '').trim().toLocaleLowerCase();
  const sortBy = url.searchParams.get('sortBy') || 'newest';
  let requests = snapshot.finditRequests.filter((request) => {
    if (category && request.category !== category) return false;
    if (city && String(request.city || '').trim().toLocaleLowerCase() !== city) return false;
    if (search && !`${request.title || ''} ${request.description || ''}`.toLocaleLowerCase().includes(search)) return false;
    return true;
  });
  const compare = {
    budget_asc: (left, right) => Number(left.budget_max || 0) - Number(right.budget_max || 0),
    budget_desc: (left, right) => Number(right.budget_max || 0) - Number(left.budget_max || 0),
    offers: (left, right) => Number(right.offer_count || 0) - Number(left.offer_count || 0),
  }[sortBy] || ((left, right) => Date.parse(right.created_at || 0) - Date.parse(left.created_at || 0));
  requests = [...requests].sort(compare);
  const total = requests.length;
  return {
    success: true,
    requests: requests.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasNextPage: page * limit < total },
    snapshotGeneratedAt: snapshot.generatedAt,
  };
};

export const getPublicCatalogFallback = async (config) => {
  if (!isPublicCatalogRequest(config)) return null;
  const directCache = readFresh(cacheKeyFor(config));
  if (directCache) return { data: directCache, source: 'browser-cache' };

  const snapshot = await snapshotFromCacheOrNetwork();
  if (!snapshot) return null;
  const url = requestUrl(config);
  const data = url.pathname.startsWith('/products') ? productResponse(snapshot, url) : finditResponse(snapshot, url);
  return data ? { data, source: 'catalog-snapshot' } : null;
};
