const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const getAllowedCodReconciliationEmails = () => new Set(
  String(process.env.COD_RECONCILIATION_ALLOWED_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)
);

const canAccessCodReconciliation = (user) => {
  const email = normalizeEmail(user?.email);
  return Boolean(email && getAllowedCodReconciliationEmails().has(email));
};

// COD reconciliation records cash collection, remittance, and seller payouts.
// It is intentionally a named-account capability, not a broad finance role.
// This keeps unrelated finance administration out of the delivery workflow.
const requireCodReconciliationAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'You are not logged in' });
  if (!canAccessCodReconciliation(req.user)) {
    return res.status(403).json({ error: 'You are not authorized to access COD reconciliation.' });
  }
  return next();
};

module.exports = {
  canAccessCodReconciliation,
  getAllowedCodReconciliationEmails,
  requireCodReconciliationAccess,
};
