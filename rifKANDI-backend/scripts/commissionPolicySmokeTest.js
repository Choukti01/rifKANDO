const assert = require('node:assert/strict');
const {
  COMMISSION_RATES,
  WITHDRAWAL_HOLD_DAYS,
  calculateCommissionMinor,
  getWithdrawalEligibility,
} = require('../src/services/commissionPolicyService');

const expectedRates = {
  product: 7.5,
  course: 9,
  service: 5,
  digital: 7,
  booking: 5,
  findit: 5,
};

assert.deepEqual(
  Object.fromEntries(Object.entries(COMMISSION_RATES).map(([type, rate]) => [type, rate.percent])),
  expectedRates
);
assert.equal(calculateCommissionMinor('product', 20_000), 1_500);
assert.equal(calculateCommissionMinor('course', 20_000), 1_800);
assert.equal(calculateCommissionMinor('service', 20_000), 1_000);
assert.equal(calculateCommissionMinor('digital', 20_000), 1_400);
assert.equal(calculateCommissionMinor('booking', 20_000), 1_000);
assert.equal(calculateCommissionMinor('findit', 20_000), 1_000);

const now = new Date('2026-08-10T12:00:00.000Z');
assert.equal(getWithdrawalEligibility('2026-07-27 12:00:00', now).eligible, true);
assert.equal(getWithdrawalEligibility('2026-07-28 12:00:01', now).eligible, false);
assert.equal(getWithdrawalEligibility(null, now).eligible, false);
assert.equal(WITHDRAWAL_HOLD_DAYS, 14);

console.log('Commission policy smoke test passed.');
