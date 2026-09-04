const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const testDirectory = path.join(os.tmpdir(), `rifkando-order-history-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'order-history-authorization-test-secret';
process.env.SESSION_SECRET = 'order-history-session-test-secret-that-is-long-enough';
process.env.CLIENT_URL = 'https://www.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const { establishTestSessionForEmail } = require('./helpers/testSession');

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

const testPassword = 'order-history-test-password';

const readSetCookies = (response) => {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const value = response.headers.get('set-cookie');
  return value ? [value] : [];
};

const fetchHistory = async (port, orderId, cookie) => {
  const response = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/history`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  return { status: response.status, body: await response.json() };
};

const createUser = async (name, role) => {
  const email = `${name.toLowerCase().replaceAll(' ', '-')}@test.local`;
  const result = await runStatement(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, await bcrypt.hash(testPassword, 12), role]
  );
  return { id: result.lastID, email };
};

const loginAs = async (_port, user) => {
  const session = await establishTestSessionForEmail(db, user.email);
  return session.cookies.join('; ');
};

const run = async () => {
  await db.ready;

  const buyer = await createUser('Order Owner', 'buyer');
  const sellerOne = await createUser('Participating Seller One', 'seller');
  const sellerTwo = await createUser('Participating Seller Two', 'seller');
  const unrelatedBuyer = await createUser('Unrelated Buyer', 'buyer');
  const unrelatedSeller = await createUser('Unrelated Seller', 'seller');
  const admin = await createUser('Order Administrator', 'admin');
  const productOne = await runStatement(
    "INSERT INTO products (title, price, seller_id, stock, status) VALUES (?, ?, ?, ?, 'published')",
    ['First order product', 100, sellerOne.id, 3]
  );
  const productTwo = await runStatement(
    "INSERT INTO products (title, price, seller_id, stock, status) VALUES (?, ?, ?, ?, 'published')",
    ['Second order product', 200, sellerTwo.id, 3]
  );
  const order = await runStatement(
    "INSERT INTO orders (order_number, user_id, total, status, payment_method) VALUES (?, ?, ?, 'processing', 'wallet')",
    ['RIF-AUTH-HISTORY-1001', buyer.id, 300]
  );
  await runStatement(
    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
    [order.lastID, productOne.lastID, 1, 100, order.lastID, productTwo.lastID, 1, 200]
  );
  await runStatement(
    "INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?, 'processing', 'Seeded authorization test event', ?)",
    [order.lastID, sellerOne.id]
  );

  const server = await startServer();
  const port = server.address().port;
  try {
    const anonymous = await fetchHistory(port, order.lastID);
    assert.equal(anonymous.status, 401, 'unauthenticated callers must be rejected');

    for (const [label, user] of [
      ['buyer owner', buyer],
      ['first participating seller', sellerOne],
      ['second participating seller', sellerTwo],
      ['administrator', admin],
    ]) {
      const allowed = await fetchHistory(port, order.lastID, await loginAs(port, user));
      assert.equal(allowed.status, 200, `${label} must be able to read order history`);
      assert.equal(allowed.body.history.length, 1, `${label} must receive the expected history only`);
      assert.equal(allowed.body.history[0].order_id, order.lastID);
      assert.equal(allowed.body.history[0].note, 'Seeded authorization test event');
    }

    for (const [label, user] of [
      ['unrelated buyer', unrelatedBuyer],
      ['unrelated seller', unrelatedSeller],
    ]) {
      const denied = await fetchHistory(port, order.lastID, await loginAs(port, user));
      assert.equal(denied.status, 404, `${label} must not discover another order`);
      assert.equal(denied.body.history, undefined, `${label} must not receive history data`);
    }

    const missing = await fetchHistory(port, 999999, await loginAs(port, buyer));
    assert.equal(missing.status, 404, 'missing order identifiers must not be distinguishable from denied access');

    const removedAiRoute = await fetch(`http://127.0.0.1:${port}/api/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(removedAiRoute.status, 404, 'the removed AI API must not be reachable');
  } finally {
    await stopServer(server);
  }

  console.log('Order history authorization smoke test passed.');
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
