const commissionPolicy = require('../../../commission-policy.json');

const BASIS_POINTS_PER_PERCENT = 100;
const BASIS_POINTS_DENOMINATOR = 10_000;

const COMMISSION_RATES = Object.freeze(
  Object.fromEntries(
    Object.entries(commissionPolicy.commissionRates).map(([type, percent]) => {
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new Error(`Invalid commission rate for ${type}.`);
      }
      return [type, Object.freeze({
        percent,
        basisPoints: Math.round(percent * BASIS_POINTS_PER_PERCENT),
      })];
    })
  )
);

const WITHDRAWAL_HOLD_DAYS = commissionPolicy.withdrawalHoldDays;

if (!Number.isInteger(WITHDRAWAL_HOLD_DAYS) || WITHDRAWAL_HOLD_DAYS < 0) {
  throw new Error('Invalid withdrawal hold period.');
}

function getCommissionRate(type) {
  const rate = COMMISSION_RATES[String(type || '').trim().toLowerCase()];
  if (!rate) throw new Error(`Unsupported commission type: ${type}.`);
  return rate;
}

function calculateCommissionMinor(type, grossAmountMinor) {
  if (!Number.isSafeInteger(grossAmountMinor) || grossAmountMinor < 0) {
    throw new Error('Gross amount must be a non-negative integer in minor units.');
  }
  const { basisPoints } = getCommissionRate(type);
  return Math.round((grossAmountMinor * basisPoints) / BASIS_POINTS_DENOMINATOR);
}

function parseStoredTimestamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string' || !value.trim()) return null;

  const source = value.trim();
  const sqliteTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(source);
  const parsed = new Date(sqliteTimestamp ? `${source.replace(' ', 'T')}Z` : source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getWithdrawalEligibility(sellerStartedAt, now = new Date()) {
  const startedAt = parseStoredTimestamp(sellerStartedAt);
  if (!startedAt) {
    return Object.freeze({
      eligible: false,
      availableAt: null,
      holdDays: WITHDRAWAL_HOLD_DAYS,
    });
  }

  const availableAt = new Date(startedAt.getTime() + (WITHDRAWAL_HOLD_DAYS * 24 * 60 * 60 * 1000));
  return Object.freeze({
    eligible: now.getTime() >= availableAt.getTime(),
    availableAt: availableAt.toISOString(),
    holdDays: WITHDRAWAL_HOLD_DAYS,
  });
}

module.exports = {
  COMMISSION_RATES,
  WITHDRAWAL_HOLD_DAYS,
  calculateCommissionMinor,
  getCommissionRate,
  getWithdrawalEligibility,
};
