const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  // The API never needs to execute or embed browser content. Keep this policy
  // deliberately separate from the storefront CSP, which permits Google Sign-In.
  res.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

const createRateLimiter = ({ windowMs, max, message }) => {
  const attempts = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= max) {
      return res.status(429).json({ error: message });
    }

    recent.push(now);
    attempts.set(key, recent);
    next();
  };
};

module.exports = { securityHeaders, createRateLimiter };
