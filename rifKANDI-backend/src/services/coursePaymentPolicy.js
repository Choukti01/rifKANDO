const { calculateCommissionMinor } = require('./commissionPolicyService');

// A monetary snapshot is made at purchase time; never recalculate it from a
// listing after a buyer has been given payment instructions.
function coursePaymentAmounts(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Course price must be a positive safe integer in centimes.');
  }
  const commissionMinor = calculateCommissionMinor('course', amountMinor);
  return { amountMinor, commissionMinor, instructorPayoutMinor: amountMinor - commissionMinor, currency: 'MAD' };
}

// This policy does not perform transfers or grant access. Callers must enforce
// roles and apply transitions atomically with a verified database transaction.
function nextCoursePaymentStatus(status, action) {
  const transitions = {
    awaiting_payment: { submit: 'submitted' },
    rejected: { submit: 'submitted' },
    submitted: { verify: 'verified', reject: 'rejected' },
  };
  const next = transitions[status]?.[action];
  if (!next) throw new Error('Invalid course payment transition.');
  return next;
}

module.exports = { coursePaymentAmounts, nextCoursePaymentStatus };
