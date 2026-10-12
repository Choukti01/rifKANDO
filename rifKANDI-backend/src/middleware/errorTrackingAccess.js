const OWNER_EMAIL = 'achoukti1999@gmail.com';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

// This console is deliberately tied to a named owner account. It is not an
// admin or finance permission because error details must not be broadly shared.
const canTrackErrors = (user) => normalizeEmail(user?.email) === OWNER_EMAIL;

const requireErrorTrackingAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'You are not logged in' });
  if (!canTrackErrors(req.user)) {
    return res.status(403).json({ error: 'You are not authorized to access rifKANDO Error Tracking.' });
  }
  return next();
};

module.exports = { canTrackErrors, requireErrorTrackingAccess };
