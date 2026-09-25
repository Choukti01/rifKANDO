const sessionService = require('../services/sessionService');

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const ROLES = Object.freeze({
  BUYER: 'buyer',
  SELLER: 'seller',
  SUPPORT: 'support',
  OPERATIONS: 'operations',
  FINANCE: 'finance',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
});

const ADMIN_ROLES = Object.freeze([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
const FINANCE_ROLES = Object.freeze([ROLES.FINANCE, ...ADMIN_ROLES]);
// Operations can coordinate parcels and record non-financial delivery facts.
// They intentionally cannot reconcile cash, commission, or seller payouts.
const OPERATIONS_ROLES = Object.freeze([ROLES.OPERATIONS, ...FINANCE_ROLES]);

const hasAnyRole = (user, roles) => Boolean(
  user && [user.role, ...(Array.isArray(user.roles) ? user.roles : [])].some((role) => roles.includes(role))
);
const isAdmin = (user) => hasAnyRole(user, ADMIN_ROLES);

const protect = async (req, res, next) => {
  try {
    const cookies = sessionService.readCookies(req);
    const authenticated = await sessionService.authenticateAccessCookie(cookies[sessionService.ACCESS_COOKIE]);
    if (!authenticated) return res.status(401).json({ error: 'You are not logged in' });

    if (unsafeMethods.has(req.method) && !sessionService.hasValidCsrfToken(authenticated.session, req.get('X-CSRF-Token'))) {
      return res.status(403).json({ error: 'A valid CSRF token is required.' });
    }

    req.user = authenticated.user;
    req.authSession = authenticated.session;
    return next();
  } catch (_) {
    return res.status(401).json({ error: 'You are not logged in' });
  }
};

const optionalProtect = async (req, res, next) => {
  try {
    const cookies = sessionService.readCookies(req);
    const authenticated = await sessionService.authenticateAccessCookie(cookies[sessionService.ACCESS_COOKIE]);
    if (authenticated) {
      req.user = authenticated.user;
      req.authSession = authenticated.session;
    }
  } catch (_) {
    // Public endpoints remain public when a stale cookie is present.
  }
  return next();
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'You are not logged in' });
  }

  if (!hasAnyRole(req.user, roles)) {
    return res.status(403).json({ error: 'You are not authorized to perform this action' });
  }

  return next();
};

module.exports = {
  protect,
  optionalProtect,
  authorize,
  hasAnyRole,
  isAdmin,
  ROLES,
  ADMIN_ROLES,
  FINANCE_ROLES,
  OPERATIONS_ROLES,
};
