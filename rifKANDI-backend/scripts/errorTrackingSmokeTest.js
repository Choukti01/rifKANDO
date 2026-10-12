const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const testDirectory = path.join(os.tmpdir(), `rifkando-error-tracking-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkandi.db');
process.env.JWT_SECRET = 'error-tracking-test-jwt-secret-that-is-long-enough';
process.env.SESSION_SECRET = 'error-tracking-test-session-secret-that-is-long-enough';
process.env.AUDIT_LOG_SECRET = 'error-tracking-test-audit-secret-that-is-long-enough';
process.env.CLIENT_URL = 'https://www.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const ErrorTrackingService = require('../src/services/errorTrackingService');
const { establishTestSessionForEmail } = require('./helpers/testSession');

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) return reject(error);
    return resolve({ id: this.lastID, changes: this.changes });
  });
});
const get = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row))));
const closeDatabase = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
const startServer = () => new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
const stopServer = (server) => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
const request = (port, pathname, { method = 'GET', cookies = [], body } = {}) => fetch(`http://127.0.0.1:${port}${pathname}`, {
  method,
  headers: { Origin: 'https://www.rifkando.test', ...(cookies.length ? { Cookie: cookies.join('; ') } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
  body: body === undefined ? undefined : JSON.stringify(body),
});

async function main() {
  await db.ready;
  const password = 'correct horse battery staple';
  const hash = await bcrypt.hash(password, 12);
  await run("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'buyer', 1)", ['Owner', 'achoukti1999@gmail.com', hash]);
  await run("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'admin', 1)", ['Other Admin', 'other-admin@example.test', hash]);

  const server = await startServer();
  const port = server.address().port;
  try {
    const owner = await establishTestSessionForEmail(db, 'achoukti1999@gmail.com');
    const otherAdmin = await establishTestSessionForEmail(db, 'other-admin@example.test');

    const clientEvent = await request(port, '/api/error-tracking/client-events', {
      method: 'POST',
      body: { errorName: 'TypeError', message: 'Upload failed token=super-secret-value for buyer@example.test phone +212600000000 RIB=123456', route: '/seller/dashboard/products/add?private=yes' },
    });
    assert.equal(clientEvent.status, 202, 'public browser crash reporting is accepted with rate limiting');
    const stored = await get('SELECT * FROM application_error_events LIMIT 1');
    assert.equal(stored.source, 'frontend');
    assert.equal(stored.route, '/seller/dashboard/products/add', 'query strings are never persisted');
    assert.equal(stored.message.includes('super-secret-value'), false, 'credential-shaped values are redacted before persistence');
    assert.equal(stored.message.includes('buyer@example.test'), false, 'email-shaped values are redacted before persistence');
    assert.equal(stored.message.includes('+212600000000'), false, 'phone-shaped values are redacted before persistence');
    assert.equal(stored.message.includes('123456'), false, 'bank reference-shaped values are redacted before persistence');

    await ErrorTrackingService.record({
      source: 'backend', errorName: 'DatabaseError', message: 'A safe backend failure', route: '/api/products/25', method: 'GET', statusCode: 500, requestId: 'tracking-request-0001',
    });

    const ownerDashboard = await request(port, '/api/admin/error-tracking?hours=24', { cookies: owner.cookies });
    assert.equal(ownerDashboard.status, 200, 'the named owner can view operational errors');
    const dashboard = await ownerDashboard.json();
    assert.equal(dashboard.summary.total >= 2, true);
    assert.equal(dashboard.summary.frontend >= 1, true);
    assert.equal(dashboard.summary.backend >= 1, true);
    assert.equal(dashboard.events.some((event) => event.request_id === 'tracking-request-0001'), true);

    const denied = await request(port, '/api/admin/error-tracking', { cookies: otherAdmin.cookies });
    assert.equal(denied.status, 403, 'even an unrelated admin cannot access the owner-only error desk');
  } finally {
    await stopServer(server);
  }
  console.log('Error tracking smoke test passed.');
}

main()
  .then(closeDatabase)
  .catch(async (error) => {
    console.error(error.stack || error.message);
    await closeDatabase().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => { await fs.rm(testDirectory, { recursive: true, force: true }); });
