const OWNER_EMAIL = 'achoukti1999@gmail.com';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

// Service bank transfers are a temporary manual settlement flow. They expose
// financial evidence and payout references, so access is deliberately tied to
// the named founder account rather than a broad marketplace role.
const canAccessServiceReconciliation = (user) => normalizeEmail(user?.email) === OWNER_EMAIL;

const requireServiceReconciliationAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'You are not logged in.' });
  if (!canAccessServiceReconciliation(req.user)) {
    return res.status(403).json({ error: 'You are not authorized to access Services Reconciliation.' });
  }
  return next();
};

module.exports = { canAccessServiceReconciliation, requireServiceReconciliationAccess };
