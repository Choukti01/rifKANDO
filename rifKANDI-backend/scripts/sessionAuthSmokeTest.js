const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const testDirectory = path.join(os.tmpdir(), `rifkando-session-auth-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-session-tests';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-session-tests';
process.env.AUDIT_LOG_SECRET = 'test-audit-secret-that-is-long-enough-for-session-tests';
process.env.CLIENT_URL = 'https://www.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) return reject(error);
    return resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const closeDatabase = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

const startServer = () => new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});

const stopServer = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

const readSetCookies = (response) => {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const value = response.headers.get('set-cookie');
  return value ? [value] : [];
};

const updateCookieJar = (jar, response) => {
  for (const setCookie of readSetCookies(response)) {
    const [pair] = setCookie.split(';');
    const separator = pair.indexOf('=');
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
};

const cookieHeader = (jar) => [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');

const request = async (port, pathname, { method = 'GET', jar, csrfToken, body, headers = {} } = {}) => {
  const requestHeaders = {
    Origin: 'https://www.rifkando.test',
    ...headers,
  };
  if (jar?.size) requestHeaders.Cookie = cookieHeader(jar);
  if (csrfToken) requestHeaders['X-CSRF-Token'] = csrfToken;
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response;
};

const readJson = async (response) => ({ response, body: await response.json() });

const login = async (port, email, password) => {
  const jar = new Map();
  const { response, body } = await readJson(await request(port, '/api/auth/login', {
    method: 'POST',
    body: { email, password },
  }));
  assert.equal(response.status, 200, 'login must succeed');
  assert.equal(body.token, undefined, 'login must never return a browser-readable bearer token');
  assert.equal(typeof body.csrfToken, 'string');
  assert.equal(body.csrfToken.length >= 32, true);
  updateCookieJar(jar, response);
  const cookies = readSetCookies(response).join('\n');
  assert.match(cookies, /rifkando_access=.*HttpOnly/i);
  assert.match(cookies, /rifkando_refresh=.*HttpOnly/i);
  assert.match(cookies, /rifkando_csrf=/i);
  return { jar, csrfToken: body.csrfToken };
};

const run = async () => {
  await db.ready;
  const seedPassword = 'correct horse battery staple';
  let sessionPassword = seedPassword;
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const testUsers = [
    ['Session Test User', 'session-test@example.test', 'buyer'],
    ['Finance Test User', 'finance-test@example.test', 'finance'],
    ['Reviewer Test User', 'reviewer-test@example.test', 'verification_reviewer'],
    ['Admin Test User', 'admin-test@example.test', 'admin'],
    ['Super Admin Test User', 'super-admin-test@example.test', 'super_admin'],
  ];
  await Promise.all(testUsers.map(([name, email, role]) => runStatement(
    'INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, 1)',
    [name, email, passwordHash, role]
  )));

  const server = await startServer();
  const port = server.address().port;
  try {
    const session = await login(port, 'session-test@example.test', sessionPassword);

    const me = await readJson(await request(port, '/api/auth/me', { jar: session.jar }));
    assert.equal(me.response.status, 200, 'access cookie must authenticate /auth/me');
    assert.equal(me.body.data.user.email, 'session-test@example.test');
    assert.equal(me.body.csrfToken, session.csrfToken, 'CSRF token is available only through the authenticated session');

    const otherDevice = await login(port, 'session-test@example.test', sessionPassword);
    const updatedPassword = 'an even stronger horse battery staple';
    const passwordChange = await request(port, '/api/users/update-password', {
      method: 'PATCH',
      jar: session.jar,
      csrfToken: session.csrfToken,
      body: { currentPassword: sessionPassword, newPassword: updatedPassword },
    });
    assert.equal(passwordChange.status, 200, 'authenticated users must be able to change their password');
    sessionPassword = updatedPassword;
    const currentSessionAfterPasswordChange = await request(port, '/api/auth/me', { jar: session.jar });
    assert.equal(currentSessionAfterPasswordChange.status, 200, 'the session that changed the password remains active');
    const otherSessionAfterPasswordChange = await request(port, '/api/auth/me', { jar: otherDevice.jar });
    assert.equal(otherSessionAfterPasswordChange.status, 401, 'password changes must revoke other active sessions');

    const legacyBearer = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const bearerOnly = await request(port, '/api/auth/me', {
      headers: { Authorization: `Bearer ${legacyBearer}` },
    });
    assert.equal(bearerOnly.status, 401, 'legacy bearer tokens must not authenticate browser requests');

    const missingCsrf = await request(port, '/api/auth/logout', { method: 'POST', jar: session.jar });
    assert.equal(missingCsrf.status, 403, 'state-changing requests require a CSRF token');

    const logout = await request(port, '/api/auth/logout', {
      method: 'POST',
      jar: session.jar,
      csrfToken: session.csrfToken,
    });
    assert.equal(logout.status, 204, 'logout with CSRF must revoke the session');
    const loggedOut = await request(port, '/api/auth/me', { jar: session.jar });
    assert.equal(loggedOut.status, 401, 'revoked sessions must not authenticate');

    const rotatingSession = await login(port, 'session-test@example.test', sessionPassword);
    const oldRefreshToken = rotatingSession.jar.get('rifkando_refresh');
    const refresh = await readJson(await request(port, '/api/auth/refresh', {
      method: 'POST',
      jar: rotatingSession.jar,
    }));
    assert.equal(refresh.response.status, 200, 'refresh token rotation must succeed once');
    assert.equal(refresh.body.token, undefined, 'refresh must not return an access token in JSON');
    assert.notEqual(refresh.body.csrfToken, rotatingSession.csrfToken, 'rotation must replace the CSRF token');
    updateCookieJar(rotatingSession.jar, refresh.response);

    const replayJar = new Map(rotatingSession.jar);
    replayJar.set('rifkando_refresh', oldRefreshToken);
    const replay = await request(port, '/api/auth/refresh', { method: 'POST', jar: replayJar });
    assert.equal(replay.status, 401, 'reused refresh tokens must be rejected');
    const revokedAfterReplay = await request(port, '/api/auth/me', { jar: rotatingSession.jar });
    assert.equal(revokedAfterReplay.status, 401, 'refresh-token replay must revoke all user sessions');

    const legacyEndpoint = await request(port, '/api/auth/verify-and-register', { method: 'POST', body: {} });
    assert.equal(legacyEndpoint.status, 410, 'legacy token-issuing auth routes must remain disabled');

    const preflight = await request(port, '/api/auth/me', {
      method: 'OPTIONS',
      headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'X-CSRF-Token, Content-Type' },
    });
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    assert.match(preflight.headers.get('access-control-allow-headers') || '', /X-CSRF-Token/i);

    const buyer = await login(port, 'session-test@example.test', sessionPassword);
    const finance = await login(port, 'finance-test@example.test', seedPassword);
    const reviewer = await login(port, 'reviewer-test@example.test', seedPassword);
    const admin = await login(port, 'admin-test@example.test', seedPassword);
    const superAdmin = await login(port, 'super-admin-test@example.test', seedPassword);

    const buyerDeniedFinance = await request(port, '/api/admin/withdrawals', { jar: buyer.jar });
    assert.equal(buyerDeniedFinance.status, 403, 'buyers must not access finance operations');

    const financeWithdrawals = await request(port, '/api/admin/withdrawals', { jar: finance.jar });
    assert.equal(financeWithdrawals.status, 200, 'finance operators must access withdrawal operations');
    const financeDeniedVerification = await request(port, '/api/admin/pending-verifications', { jar: finance.jar });
    assert.equal(financeDeniedVerification.status, 403, 'finance operators must not access KYC review data');

    const reviewerVerifications = await request(port, '/api/admin/pending-verifications', { jar: reviewer.jar });
    assert.equal(reviewerVerifications.status, 200, 'verification reviewers must access KYC review data');
    const reviewerDeniedFinance = await request(port, '/api/admin/withdrawals', { jar: reviewer.jar });
    assert.equal(reviewerDeniedFinance.status, 403, 'verification reviewers must not access finance operations');

    const adminFinance = await request(port, '/api/admin/withdrawals', { jar: admin.jar });
    assert.equal(adminFinance.status, 200, 'existing administrators retain finance access');
    const adminVerification = await request(port, '/api/admin/pending-verifications', { jar: admin.jar });
    assert.equal(adminVerification.status, 200, 'existing administrators retain verification access');

    const superAdminFinance = await request(port, '/api/admin/withdrawals', { jar: superAdmin.jar });
    assert.equal(superAdminFinance.status, 200, 'super administrators must access finance operations');
    const superAdminVerification = await request(port, '/api/admin/pending-verifications', { jar: superAdmin.jar });
    assert.equal(superAdminVerification.status, 200, 'super administrators must access verification operations');
    const adminAuditLogs = await request(port, '/api/admin/audit-logs', { jar: admin.jar });
    assert.equal(adminAuditLogs.status, 403, 'only super administrators may inspect the audit trail');
    const auditLogs = await readJson(await request(port, '/api/admin/audit-logs', { jar: superAdmin.jar }));
    assert.equal(auditLogs.response.status, 200, 'super administrators must be able to inspect the audit trail');
    assert.equal(auditLogs.body.integrity.valid, true, 'audit trail integrity must validate before it is shown');
    assert.equal(auditLogs.body.entries.some((entry) => entry.action === 'finance.withdrawals_viewed'), true);
    assert.equal(auditLogs.body.entries.some((entry) => entry.action === 'verification.pending_list_viewed'), true);
    assert.equal(auditLogs.body.entries.some((entry) => Object.hasOwn(entry, 'user_agent_hash')), false, 'audit review responses must not expose browser fingerprints');
  } finally {
    await stopServer(server);
  }

  console.log('Cookie session authentication smoke test passed.');
};

run()
  .then(closeDatabase)
  .catch(async (error) => {
    console.error(error.stack || error.message);
    try {
      await closeDatabase();
    } catch (_) {
      // Preserve the original failure.
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });
