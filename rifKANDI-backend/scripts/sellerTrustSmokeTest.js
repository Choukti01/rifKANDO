const assert = require('node:assert/strict');
const { buildSellerTrust } = require('../src/services/sellerTrustService');

const now = new Date('2026-11-05T12:00:00.000Z');

const reliable = buildSellerTrust({
  sellerSince: '2025-01-01 00:00:00',
  deliveredOrders: 3,
  verifiedReviewCount: 3,
  verifiedAverageRating: 4.4,
}, now);
assert.equal(reliable.badge, 'reliable');
assert.equal(reliable.verifiedAverageRating, 4.4);

const newSeller = buildSellerTrust({
  sellerSince: '2026-10-25 00:00:00',
  deliveredOrders: 0,
  verifiedReviewCount: 0,
}, now);
assert.equal(newSeller.badge, 'new');

const unprovenSeller = buildSellerTrust({
  sellerSince: '2024-01-01 00:00:00',
  deliveredOrders: 2,
  verifiedReviewCount: 2,
  verifiedAverageRating: 5,
}, now);
assert.equal(unprovenSeller.badge, null);

console.log('Seller trust policy smoke test passed.');
