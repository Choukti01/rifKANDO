const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const getAllowedCodOperationsEmails = () => new Set(
  String(process.env.COD_OPERATIONS_ALLOWED_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)
);

// Keep operations as a narrow capability: an account can coordinate parcels
// without losing its normal buyer or seller role. Existing dedicated
// operations/administrator accounts retain access during this transition.
const OPERATIONS_ROLES = new Set(['operations', 'finance', 'admin', 'super_admin']);

const canAccessCodOperations = (user) => {
  const email = normalizeEmail(user?.email);
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])];
  return Boolean(
    (email && getAllowedCodOperationsEmails().has(email))
    || roles.some((role) => OPERATIONS_ROLES.has(role))
  );
};

const requireCodOperationsAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'You are not logged in' });
  if (!canAccessCodOperations(req.user)) {
    return res.status(403).json({ error: 'You are not authorized to access COD operations.' });
  }
  return next();
};

module.exports = {
  canAccessCodOperations,
  requireCodOperationsAccess,
};
