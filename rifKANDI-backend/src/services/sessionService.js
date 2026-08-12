const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const ACCESS_COOKIE = 'rifkando_access';
const REFRESH_COOKIE = 'rifkando_refresh';
const CSRF_COOKIE = 'rifkando_csrf';
const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 15 * 60);
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const SESSION_ISSUER = 'rifkando-api';
const SESSION_AUDIENCE = 'rifkando-web';

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) return reject(error);
    return resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
});

const hash = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');
const sessionSecret = () => process.env.SESSION_SECRET || process.env.JWT_SECRET;
const isProduction = () => process.env.NODE_ENV === 'production';

const cookieOptions = (maxAge, httpOnly = true, path = '/api') => ({
  httpOnly,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path,
  maxAge,
});

const clearCookieOptions = (httpOnly = true, path = '/api') => ({
  httpOnly,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path,
});

const readCookies = (request) => Object.fromEntries(
  String(request.headers.cookie || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf('=');
      if (separator < 1) return [entry, ''];
      try {
        return [entry.slice(0, separator), decodeURIComponent(entry.slice(separator + 1))];
      } catch (_) {
        return [entry.slice(0, separator), ''];
      }
    })
);

const isPhoneIdentityEmail = (email) => String(email || '').endsWith('@phone.rifkando.invalid');

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: isPhoneIdentityEmail(user.email) ? null : user.email,
  phone: user.phone,
  role: user.role,
  sellerType: user.seller_type,
  bio: user.bio,
  city: user.city,
  country: user.country,
  profilePicture: user.profilePicture,
});

const issueAccessToken = (userId, sessionId) => jwt.sign(
  { sub: String(userId), sid: sessionId, token_use: 'access' },
  sessionSecret(),
  {
    algorithm: 'HS256',
    expiresIn: ACCESS_TTL_SECONDS,
    issuer: SESSION_ISSUER,
    audience: SESSION_AUDIENCE,
  }
);

const createSession = async ({ userId, userAgent = '', ip = '' }) => {
  const id = crypto.randomUUID();
  const refreshToken = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const userAgentHash = userAgent ? hash(userAgent).slice(0, 64) : null;
  const ipHash = ip ? hash(ip).slice(0, 64) : null;

  await run(`
    INSERT INTO auth_sessions (
      id, user_id, refresh_token_hash, csrf_token_hash, expires_at, user_agent_hash, ip_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, userId, hash(refreshToken), hash(csrfToken), expiresAt, userAgentHash, ipHash]);

  return { id, userId, refreshToken, csrfToken, expiresAt };
};

const setSessionCookies = (response, session) => {
  response.cookie(ACCESS_COOKIE, issueAccessToken(session.userId, session.id), cookieOptions(ACCESS_TTL_SECONDS * 1000));
  response.cookie(REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000, true, '/api/auth'));
  // The CSRF token is host-only and is only returned to allowed browser origins
  // through authenticated API responses. It is never a credential.
  response.cookie(CSRF_COOKIE, session.csrfToken, cookieOptions(REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000, false));
};

const clearSessionCookies = (response) => {
  response.clearCookie(ACCESS_COOKIE, clearCookieOptions());
  response.clearCookie(REFRESH_COOKIE, clearCookieOptions(true, '/api/auth'));
  response.clearCookie(CSRF_COOKIE, clearCookieOptions(false));
};

const loadActiveSession = async (sessionId, userId) => {
  const row = await get(`
    SELECT
      s.id AS session_id, s.user_id AS session_user_id, s.csrf_token_hash,
      s.expires_at, s.revoked_at,
      u.id, u.name, u.email, u.password, u.phone, u.role, u.seller_type,
      u.bio, u.city, u.country, u.profilePicture
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.user_id = ?
    LIMIT 1
  `, [sessionId, userId]);

  if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) return null;
  const session = {
    id: row.session_id,
    userId: row.session_user_id,
    csrfTokenHash: row.csrf_token_hash,
    expiresAt: row.expires_at,
  };
  const user = { ...row };
  delete user.session_id;
  delete user.session_user_id;
  delete user.csrf_token_hash;
  delete user.expires_at;
  delete user.revoked_at;
  return { session, user };
};

const authenticateAccessCookie = async (accessToken) => {
  if (!accessToken) return null;
  try {
    const payload = jwt.verify(accessToken, sessionSecret(), {
      algorithms: ['HS256'],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (payload.token_use !== 'access' || !payload.sid || !payload.sub) return null;
    return loadActiveSession(payload.sid, Number(payload.sub));
  } catch (_) {
    return null;
  }
};

const hasValidCsrfToken = (session, csrfToken) => {
  if (!csrfToken || !session?.csrfTokenHash) return false;
  const expected = Buffer.from(session.csrfTokenHash, 'hex');
  const received = Buffer.from(hash(csrfToken), 'hex');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

const rotateRefreshToken = async ({ refreshToken, userAgent = '', ip = '' }) => {
  if (!refreshToken) return null;
  const session = await get(`
    SELECT id, user_id, expires_at, revoked_at, revocation_reason
    FROM auth_sessions
    WHERE refresh_token_hash = ?
    LIMIT 1
  `, [hash(refreshToken)]);

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;
  if (session.revoked_at) {
    if (session.revocation_reason === 'rotated') {
      await revokeAllUserSessions(session.user_id, 'refresh_reuse_detected');
    }
    return null;
  }

  const replacement = await createSession({ userId: session.user_id, userAgent, ip });
  const revoked = await run(`
    UPDATE auth_sessions
    SET revoked_at = CURRENT_TIMESTAMP, revocation_reason = 'rotated', replaced_by = ?, last_used_at = CURRENT_TIMESTAMP
    WHERE id = ? AND revoked_at IS NULL
  `, [replacement.id, session.id]);

  if (revoked.changes !== 1) {
    await run("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP, revocation_reason = 'rotation_race' WHERE id = ?", [replacement.id]);
    await revokeAllUserSessions(session.user_id, 'refresh_reuse_detected');
    return null;
  }

  return replacement;
};

const revokeSession = (sessionId, reason = 'logout') => run(`
  UPDATE auth_sessions
  SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP), revocation_reason = COALESCE(revocation_reason, ?)
  WHERE id = ?
`, [reason, sessionId]);

const revokeAllUserSessions = (userId, reason = 'logout_all') => run(`
  UPDATE auth_sessions
  SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP), revocation_reason = COALESCE(revocation_reason, ?)
  WHERE user_id = ?
`, [reason, userId]);

const revokeOtherUserSessions = (userId, currentSessionId, reason = 'password_changed') => run(`
  UPDATE auth_sessions
  SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP), revocation_reason = COALESCE(revocation_reason, ?)
  WHERE user_id = ? AND id != ?
`, [reason, userId, currentSessionId]);

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  readCookies,
  publicUser,
  createSession,
  setSessionCookies,
  clearSessionCookies,
  authenticateAccessCookie,
  hasValidCsrfToken,
  rotateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  revokeOtherUserSessions,
};
