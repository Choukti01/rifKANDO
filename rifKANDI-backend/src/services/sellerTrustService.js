const DAY_MS = 24 * 60 * 60 * 1000;

const parseStoredTimestamp = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string' || !value.trim()) return null;

  const source = value.trim();
  const isSqliteTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(source);
  const parsed = new Date(isSqliteTimestamp ? `${source.replace(' ', 'T')}Z` : source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Build a deliberately conservative public seller-reputation summary.
 *
 * Every figure comes from an actual delivered COD fulfilment or a review tied
 * to a delivered order. This avoids presenting a marketing claim as a trust
 * signal, and keeps the rules portable between the SQLite dev database and
 * PostgreSQL production database.
 */
const buildSellerTrust = ({ sellerSince, deliveredOrders = 0, verifiedReviewCount = 0, verifiedAverageRating = 0 }, now = new Date()) => {
  const startedAt = parseStoredTimestamp(sellerSince);
  const accountAgeDays = startedAt
    ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS))
    : null;
  const delivered = Math.max(0, Number(deliveredOrders) || 0);
  const reviews = Math.max(0, Number(verifiedReviewCount) || 0);
  const rating = Math.max(0, Number(verifiedAverageRating) || 0);

  let badge = null;
  if (delivered >= 3 && reviews >= 3 && rating >= 4) {
    badge = 'reliable';
  } else if (delivered === 0 && accountAgeDays !== null && accountAgeDays < 60) {
    badge = 'new';
  }

  return {
    deliveredOrders: delivered,
    verifiedReviewCount: reviews,
    verifiedAverageRating: Math.round(rating * 10) / 10,
    accountAgeDays,
    badge,
  };
};

module.exports = { buildSellerTrust, parseStoredTimestamp };
