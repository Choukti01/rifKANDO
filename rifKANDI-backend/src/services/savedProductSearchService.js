const { all, run } = require('./bookingProtocolService');

const MAX_SAVED_SEARCHES_PER_USER = 20;
const CONDITIONS = new Set(['new', 'used_as_new', 'joutiya']);
const SECTIONS = new Set(['products', 'mida']);

class SavedProductSearchError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = 'SavedProductSearchError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const text = (value, field, maxLength) => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new SavedProductSearchError(`${field} must be text.`);
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length > maxLength) throw new SavedProductSearchError(`${field} is too long.`);
  return normalized;
};

const optionalMinor = (value, field, Money) => {
  if (value === undefined || value === null || value === '') return null;
  const minor = Money.toMinor(value);
  if (!Number.isSafeInteger(minor) || minor < 0) throw new SavedProductSearchError(`${field} is invalid.`);
  return minor;
};

const optionalRating = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) throw new SavedProductSearchError('Minimum rating is invalid.');
  return Math.round(rating * 10) / 10;
};

const normalizeFilters = (input, Money) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new SavedProductSearchError('Saved search filters are invalid.');
  }
  const search = text(input.search, 'Search', 120);
  const category = text(input.category, 'Category', 64);
  const city = text(input.city, 'City', 100);
  const minPriceMinor = optionalMinor(input.minPrice, 'Minimum price', Money);
  const maxPriceMinor = optionalMinor(input.maxPrice, 'Maximum price', Money);
  const minRating = optionalRating(input.minRating);
  const condition = input.condition ? text(input.condition, 'Condition', 32) : '';
  const section = input.section ? text(input.section, 'Marketplace section', 32) : 'products';

  if (condition && !CONDITIONS.has(condition)) throw new SavedProductSearchError('Condition is invalid.');
  if (!SECTIONS.has(section)) throw new SavedProductSearchError('Marketplace section is invalid.');
  if (minPriceMinor !== null && maxPriceMinor !== null && minPriceMinor > maxPriceMinor) {
    throw new SavedProductSearchError('Minimum price cannot exceed maximum price.');
  }
  // A condition alone would be an unbounded feed, not a useful saved search.
  if (!search && !category && !city && minPriceMinor === null && maxPriceMinor === null && minRating === null) {
    throw new SavedProductSearchError('Add a keyword, category, city, price range, or rating before saving a search.');
  }

  return { search, category, city, minPriceMinor, maxPriceMinor, minRating, condition, section };
};

const signatureFor = (filters) => JSON.stringify(filters);

const parseFilters = (value) => {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
};

const matchesProduct = (filters, product) => {
  if (!filters || String(product.marketplace_section || 'products') !== filters.section) return false;
  if (filters.condition && product.condition !== filters.condition) return false;
  if (filters.category && String(product.category || '').toLowerCase() !== filters.category.toLowerCase()) return false;
  if (filters.city && String(product.origin_city || '').trim().toLowerCase() !== filters.city.trim().toLowerCase()) return false;
  const haystack = `${product.title || ''} ${product.description || ''}`.toLowerCase();
  if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
  if (filters.minPriceMinor !== null && Number(product.price_minor) < Number(filters.minPriceMinor)) return false;
  if (filters.maxPriceMinor !== null && Number(product.price_minor) > Number(filters.maxPriceMinor)) return false;
  if (filters.minRating !== null && Number(product.rating || 0) < Number(filters.minRating)) return false;
  return true;
};

const notifyMatchingProductSearches = async ({ db, NotificationService, product }) => {
  if (!NotificationService || !product?.id) return 0;
  const searches = await all(db, `
    SELECT id, user_id, filters
    FROM saved_product_searches
    WHERE active
      AND user_id <> ?
  `, [product.seller_id]);

  let delivered = 0;
  for (const savedSearch of searches) {
    const filters = parseFilters(savedSearch.filters);
    if (!matchesProduct(filters, product)) continue;
    const marker = await run(db, `
      INSERT OR IGNORE INTO saved_product_search_notifications (saved_search_id, product_id)
      VALUES (?, ?)
    `, [savedSearch.id, product.id]);
    if (Number(marker?.changes || 0) !== 1) continue;
    await NotificationService.create({
      userId: savedSearch.user_id,
      kind: 'catalog.saved_search_match',
      title: 'A product matches your saved search',
      body: `“${String(product.title || 'A new listing').slice(0, 140)}” was just added to rifKANDO.`,
      href: `/product/${product.id}`,
      metadata: { productId: product.id, savedSearchId: savedSearch.id },
    });
    delivered += 1;
  }
  return delivered;
};

module.exports = {
  MAX_SAVED_SEARCHES_PER_USER,
  SavedProductSearchError,
  normalizeFilters,
  signatureFor,
  parseFilters,
  matchesProduct,
  notifyMatchingProductSearches,
};
