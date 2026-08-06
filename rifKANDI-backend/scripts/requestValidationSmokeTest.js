const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const testDirectory = path.join(os.tmpdir(), `rifkando-validation-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation-tests';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-validation-tests';
process.env.CLIENT_URL = 'https://www.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) return reject(error);
    return resolve();
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

const cookiesFrom = (response) => {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return values.map((value) => value.split(';')[0]);
};

const request = async (port, pathname, { method = 'GET', cookies = [], csrfToken, body } = {}) => {
  const headers = { Origin: 'https://www.rifkando.test' };
  if (cookies.length) headers.Cookie = cookies.join('; ');
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`http://127.0.0.1:${port}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
};

const login = async (port, email, password) => {
  const response = await request(port, '/api/auth/login', { method: 'POST', body: { email, password } });
  const body = await response.json();
  assert.equal(response.status, 200, 'test login must succeed');
  return { cookies: cookiesFrom(response), csrfToken: body.csrfToken };
};

const assertValidationError = async (response, message) => {
  assert.equal(response.status, 422, message);
  const body = await response.json();
  assert.equal(body.code, 'VALIDATION_ERROR', 'validation failures use the standard public error code');
  assert.equal(Array.isArray(body.fields), true, 'validation failures identify the invalid field');
};

const run = async () => {
  await db.ready;
  const password = 'correct horse battery staple';
  const passwordHash = await bcrypt.hash(password, 12);
  await runStatement(
    "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'buyer', 1)",
    ['Validation Buyer', 'validation-buyer@example.test', passwordHash]
  );
  await runStatement(
    "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'finance', 1)",
    ['Validation Finance', 'validation-finance@example.test', passwordHash]
  );
  await runStatement(
    "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'seller', 1)",
    ['Validation Seller', 'validation-seller@example.test', passwordHash]
  );

  const server = await startServer();
  const port = server.address().port;
  try {
    const buyer = await login(port, 'validation-buyer@example.test', password);
    const finance = await login(port, 'validation-finance@example.test', password);
    const seller = await login(port, 'validation-seller@example.test', password);

    await assertValidationError(await request(port, '/api/products?limit=101'), 'oversized pagination must be rejected');
    await assertValidationError(await request(port, '/api/cart/1', {
      method: 'PUT', cookies: buyer.cookies, csrfToken: buyer.csrfToken, body: { quantity: '2' },
    }), 'cart quantities must be JSON integers');
    await assertValidationError(await request(port, '/api/orders/1%20OR%201=1/cancel', {
      method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken,
    }), 'route identifiers must not accept SQL-like input');
    await assertValidationError(await request(port, '/api/orders', {
      method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken,
      body: {
        shippingAddress: { fullName: 'Validation Buyer', email: 'validation@example.test', phone: '+212600000000', address: '1 Test Street', city: 'Rabat', postalCode: '' },
        paymentMethod: 'cash', notes: '', items: [{ id: 1, quantity: 1 }], total: '100',
      },
    }), 'checkout totals must be numeric currency amounts');
    await assertValidationError(await request(port, '/api/wallet/withdraw', {
      method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken,
      body: { amount: 100, method: 'bank_transfer', bankDetails: { bank: '', account_name: '', account_number: '', rib: '' } },
    }), 'withdrawals require complete bank details');
    await assertValidationError(await request(port, '/api/products/1/offers', {
      method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken, body: { amount: 0, message: 'Invalid' },
    }), 'offers must have a positive currency amount');
    await assertValidationError(await request(port, '/api/products', {
      method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken,
      body: { title: 'Valid product', description: 'This description is long enough.', price: -1, category: 'Home', stock: 1, condition: 'new' },
    }), 'seller listings must reject invalid monetary values');
    await assertValidationError(await request(port, '/api/courses', {
      method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken,
      body: { title: 'Valid course', description: 'This description is long enough.', price: 100, category: 'Programming', level: 'expert', duration: 1, what_you_learn: '[]', media: [] },
    }), 'courses must reject unsupported levels');
    await assertValidationError(await request(port, '/api/services', {
      method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken,
      body: { title: 'Valid service', description: 'This description is long enough.', price: 100, category: 'Design', delivery_time: '2 days', revisions: 101, image: '', media: [] },
    }), 'services must cap revision counts');
    await assertValidationError(await request(port, '/api/bookings', {
      method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken,
      body: { title: 'Valid booking', description: 'This description is long enough.', price: 100, category: 'Consultation', duration: 2, location_type: 'online', location: '', max_participants: 1, media: [] },
    }), 'bookings must enforce a safe duration range');
    await assertValidationError(await request(port, '/api/digital', {
      method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken,
      body: { title: 'Valid digital product', description: 'This description is long enough.', price: 100, category: 'Ebooks', file_type: 'file', file_url: 'https://example.test/file.pdf', media: [] },
    }), 'digital products must reference private uploaded files');
    await assertValidationError(await request(port, '/api/courses/1/lessons', {
      method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken,
      body: { title: 'x', description: '', duration: 0, order: 0, is_preview: false },
    }), 'lessons must enforce title limits');
    await assertValidationError(await request(port, '/api/services/1/packages', {
      method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken,
      body: { name: 'Starter', price: -1, delivery_time: '1 day', revisions: 0, features: '' },
    }), 'service packages must reject invalid prices');
    await assertValidationError(await request(port, '/api/admin/withdrawals/not-an-id/process', {
      method: 'PATCH', cookies: finance.cookies, csrfToken: finance.csrfToken,
      body: { action: 'approve', providerReference: 'PAYOUT-1', notes: '' },
    }), 'financial route identifiers must be numeric');
    await assertValidationError(await request(port, '/api/admin/withdrawals/1/process', {
      method: 'PATCH', cookies: finance.cookies, csrfToken: finance.csrfToken,
      body: { action: 'approve', providerReference: '', notes: '' },
    }), 'withdrawal approvals require a payout reference');
  } finally {
    await stopServer(server);
  }

  console.log('Request validation smoke test passed.');
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
