const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const testDirectory = path.join(os.tmpdir(), `rifkando-critical-workflows-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.UPLOADS_DIR = path.join(testDirectory, 'uploads');
process.env.OBJECT_STORAGE_DRIVER = 'local';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-workflow-tests';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-workflow-tests';
process.env.AUDIT_LOG_SECRET = 'test-audit-secret-that-is-long-enough-for-workflow-tests';
process.env.CMI_STORE_KEY = 'test-store-key';
process.env.CMI_CLIENT_ID = 'test-client-id';
process.env.CLIENT_URL = 'https://www.rifkando.test';
process.env.BACKEND_URL = 'https://api.rifkando.test';
process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=true,courses=false,services=false,digital=true';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const { establishTestSessionForEmail } = require('./helpers/testSession');
const storage = require('../src/services/storageService');
const WalletService = require('../src/services/walletService');

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) return reject(error);
    return resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const getRow = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
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

const request = async (port, pathname, { method = 'GET', cookies = [], csrfToken, body, headers = {} } = {}) => {
  const requestHeaders = { Origin: 'https://www.rifkando.test', ...headers };
  if (cookies.length) requestHeaders.Cookie = cookies.join('; ');
  if (csrfToken) requestHeaders['X-CSRF-Token'] = csrfToken;
  if (body !== undefined && !requestHeaders['Content-Type']) requestHeaders['Content-Type'] = 'application/json';
  return fetch(`http://127.0.0.1:${port}${pathname}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
};

const login = async (_port, email, _password) => establishTestSessionForEmail(db, email);

const signCmiCallback = (callback) => {
  const signed = { ...callback };
  signed.HASHPARAMS = 'oid:amount:clientid:currency:ProcReturnCode:';
  signed.HASHPARAMSVAL = `${signed.oid}${signed.amount}${signed.clientid}${signed.currency}${signed.ProcReturnCode}`;
  signed.HASH = crypto.createHash('sha512')
    .update(`${signed.HASHPARAMSVAL}${process.env.CMI_STORE_KEY}`, 'utf8')
    .digest('base64');
  return signed;
};

const address = {
  fullName: 'Workflow Buyer',
  email: 'workflow-buyer@example.test',
  phone: '0600000000',
  address: '1 Test Street',
  city: 'Rabat',
  postalCode: '10000',
};

const run = async () => {
  await db.ready;
  const password = 'correct horse battery staple';
  const passwordHash = await bcrypt.hash(password, 12);
  const buyer = await runStatement(
    "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'buyer', 1)",
    ['Workflow Buyer', 'workflow-buyer@example.test', passwordHash]
  );
  const seller = await runStatement(
    "INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'seller', 1)",
    ['Workflow Seller', 'workflow-seller@example.test', passwordHash]
  );
  const product = await runStatement(
    "INSERT INTO products (title, price, seller_id, stock, status) VALUES (?, ?, ?, ?, 'published')",
    ['Workflow CMI product', 200, seller.lastID, 3]
  );

  // Historical CMI orders still need a secure callback path after new CMI
  // checkout has been paused. Seed that legacy state directly for this test.
  const cmiOrder = await runStatement(
    `INSERT INTO orders
      (order_number, user_id, total, total_minor, payment_method, payment_status, shipping_address, notes, status)
     VALUES (?, ?, ?, ?, 'cmi', 'pending', ?, '', 'pending')`,
    ['RIF-HTTP-CMI-1001', buyer.lastID, 250, 25000, JSON.stringify(address)]
  );
  const oid = 'CMI-HTTP-WORKFLOW-1001';
  await runStatement(
    "INSERT INTO payment_transactions (order_id, cmi_oid, amount, amount_minor, status) VALUES (?, ?, ?, ?, 'pending')",
    [cmiOrder.lastID, oid, 250, 25000]
  );

  const privateKey = storage.createKey('private', `digital-files-user-${seller.lastID}`, 'pdf');
  const privateContents = Buffer.from('%PDF-rifkando-private-workflow-test');
  await storage.put(privateKey, privateContents, { contentType: 'application/pdf' });
  const digital = await runStatement(
    `INSERT INTO digital_products
      (title, description, price, category, file_type, file_url, file_name, file_content_type, seller_id, status)
     VALUES (?, ?, ?, ?, 'file', ?, ?, ?, ?, 'published')`,
    [
      'Protected workflow download',
      'Private test digital product.',
      10,
      'Ebooks',
      storage.reference(privateKey),
      'workflow.pdf',
      'application/pdf',
      seller.lastID,
    ]
  );
  await runStatement(
    `INSERT INTO digital_purchases
      (order_number, product_id, buyer_id, seller_id, price, download_url, file_type, download_limit, download_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 'file', 1, 0, 'completed')`,
    ['DIG-HTTP-WORKFLOW-1001', digital.lastID, buyer.lastID, seller.lastID, 10, storage.reference(privateKey)]
  );

  const server = await startServer();
  const port = server.address().port;
  try {
    const unsignedCallback = await request(port, '/api/payment/callback', {
      method: 'POST',
      body: { oid, result: 'success', ProcReturnCode: '00' },
    });
    assert.equal(unsignedCallback.status, 400, 'unsigned payment callbacks must be rejected');
    assert.equal(await unsignedCallback.text(), 'INVALID');
    assert.equal((await getRow('SELECT payment_status FROM orders WHERE id = ?', [cmiOrder.lastID])).payment_status, 'pending');

    // Pausing new CMI initiation must not prevent a gateway callback from
    // completing an already-authorized transaction.
    process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=true,courses=false,services=false,digital=true';
    const validCallback = signCmiCallback({
      oid,
      amount: '250.00',
      clientid: process.env.CMI_CLIENT_ID,
      currency: '504',
      ProcReturnCode: '00',
    });
    const paidCallback = await request(port, '/api/payment/callback', { method: 'POST', body: validCallback });
    assert.equal(paidCallback.status, 200, 'a valid gateway callback must be accepted');
    assert.equal(await paidCallback.text(), 'OK');
    const replayCallback = await request(port, '/api/payment/callback', { method: 'POST', body: validCallback });
    assert.equal(replayCallback.status, 200, 'valid callback replays must remain harmless');
    assert.equal((await getRow('SELECT payment_status FROM orders WHERE id = ?', [cmiOrder.lastID])).payment_status, 'paid');

    const anonymousDownload = await request(port, `/api/digital/${digital.lastID}/download`);
    assert.equal(anonymousDownload.status, 401, 'private downloads require a session');
    const buyerSession = await login(port, 'workflow-buyer@example.test', password);

    process.env.FEATURE_FLAGS = 'checkout=false,cmi_payments=false,wallet_payments=false,digital_downloads=true,courses=false,services=false,digital=true';
    const disabledCheckout = await request(port, '/api/orders', {
      method: 'POST',
      cookies: buyerSession.cookies,
      csrfToken: buyerSession.csrfToken,
      body: {},
    });
    assert.equal(disabledCheckout.status, 503, 'checkout rollback must stop new orders before validation');

    process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=true,courses=false,services=false,digital=true';
    const nonCodCheckout = await request(port, '/api/orders', {
      method: 'POST',
      cookies: buyerSession.cookies,
      csrfToken: buyerSession.csrfToken,
      headers: { 'Idempotency-Key': 'workflow-non-cod-checkout:1001' },
      body: {
        shippingAddress: address,
        paymentMethod: 'cmi',
        items: [{ id: product.lastID, quantity: 1 }],
        total: 250,
      },
    });
    assert.equal(nonCodCheckout.status, 422, 'non-COD payment methods must be rejected before order creation');

    const pausedCourses = await request(port, '/api/courses');
    assert.equal(pausedCourses.status, 503, 'paused course APIs must not expose launch-mode content');

    const disabledCmiInitiation = await request(port, '/api/payment/cmi/initiate', {
      method: 'POST',
      cookies: buyerSession.cookies,
      csrfToken: buyerSession.csrfToken,
      body: {},
    });
    assert.equal(disabledCmiInitiation.status, 503, 'CMI rollback must stop new payment initiation before validation');

    process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=true,courses=false,services=false,digital=true';
    const firstDownload = await request(port, `/api/digital/${digital.lastID}/download`, { cookies: buyerSession.cookies });
    assert.equal(firstDownload.status, 200, 'a buyer with a purchase may download the private file');
    assert.match(firstDownload.headers.get('content-disposition') || '', /attachment/i);
    assert.deepEqual(Buffer.from(await firstDownload.arrayBuffer()), privateContents);

    process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=false,courses=false,services=false,digital=false';
    const disabledDownload = await request(port, `/api/digital/${digital.lastID}/download`, { cookies: buyerSession.cookies });
    assert.equal(disabledDownload.status, 503, 'digital-delivery rollback must stop protected downloads');

    process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=true,courses=false,services=false,digital=true';
    const exhaustedDownload = await request(port, `/api/digital/${digital.lastID}/download`, { cookies: buyerSession.cookies });
    assert.equal(exhaustedDownload.status, 403, 'download limits must be enforced atomically');
    const directPrivatePath = await request(port, `/uploads/${privateKey}`);
    assert.equal(directPrivatePath.status, 404, 'private storage must never be served as a public upload');
  } finally {
    await stopServer(server);
  }

  console.log('Critical HTTP workflow smoke test passed.');
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
