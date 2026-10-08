const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-delivered-review-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_ENGINE = 'sqlite';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'delivered-review-test-secret-that-is-long-enough';
process.env.SESSION_SECRET = 'delivered-review-session-secret-that-is-long-enough';
process.env.CLIENT_URL = 'https://www.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const { establishTestSessionForEmail } = require('./helpers/testSession');
let nextPhoneSuffix = 1;

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) return reject(error);
    return resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const getStatement = (sql, params = []) => new Promise((resolve, reject) => {
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

const createUser = async (name, role) => {
  const email = `${name.toLowerCase().replaceAll(' ', '-')}@review.test`;
  const result = await runStatement(
    'INSERT INTO users (name, email, password, phone, role, city) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, 'not-used-in-test', `06${String(nextPhoneSuffix++).padStart(8, '0')}`, role, 'Nador'],
  );
  return { id: result.lastID, email };
};

const sessionHeaders = async (user) => {
  const session = await establishTestSessionForEmail(db, user.email);
  return {
    Cookie: session.cookies.join('; '),
    'X-CSRF-Token': session.csrfToken,
  };
};

const fetchJson = async (port, pathname, options = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, options);
  return { response, body: await response.json() };
};

async function run() {
  await db.ready;
  const seller = await createUser('Storefront Seller', 'seller');
  const deliveredBuyer = await createUser('Delivered Buyer', 'buyer');
  const unrelatedBuyer = await createUser('Unrelated Buyer', 'buyer');
  const product = await runStatement(
    "INSERT INTO products (title, description, price, price_minor, seller_id, stock, status, rating, review_count) VALUES (?, ?, ?, ?, ?, ?, 'published', 0, 0)",
    ['Verified review product', 'A listing used to prove delivered-order reviews.', 125, 12_500, seller.id, 2],
  );
  const order = await runStatement(
    "INSERT INTO orders (order_number, user_id, total, total_minor, order_type, status, payment_method, payment_status) VALUES (?, ?, ?, ?, 'product', 'delivered', 'cash', 'completed')",
    ['RIF-REVIEW-1001', deliveredBuyer.id, 125, 12_500],
  );
  await runStatement(
    'INSERT INTO order_items (order_id, product_id, quantity, price, price_minor) VALUES (?, ?, ?, ?, ?)',
    [order.lastID, product.lastID, 1, 125, 12_500],
  );
  await runStatement(
    `INSERT INTO cod_fulfillments (
      order_id, seller_id, source, status, settlement_status,
      gross_amount, gross_amount_minor, expected_cod_amount, expected_cod_amount_minor,
      commission, commission_minor, seller_amount, seller_amount_minor, delivered_at
    ) VALUES (?, ?, 'product', 'delivered', 'awaiting_remittance', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [order.lastID, seller.id, 125, 12_500, 125, 12_500, 6.25, 625, 118.75, 11_875],
  );

  const server = await startServer();
  const port = server.address().port;
  try {
    const publicStorefront = await fetchJson(port, `/api/sellers/${seller.id}/storefront`);
    assert.equal(publicStorefront.response.status, 200, 'public storefront must load');
    assert.equal(Object.hasOwn(publicStorefront.body.seller, 'email'), false, 'storefront must never expose seller email');
    assert.equal(Object.hasOwn(publicStorefront.body.seller, 'phone'), false, 'storefront must never expose seller phone');
    assert.equal(publicStorefront.body.products.length, 1, 'storefront must include published products');

    const publicProfile = await fetchJson(port, `/api/users/${seller.id}`);
    assert.equal(Object.hasOwn(publicProfile.body.user, 'email'), false, 'legacy public profile must redact email');
    assert.equal(Object.hasOwn(publicProfile.body.user, 'phone'), false, 'legacy public profile must redact phone');

    const anonymous = await fetchJson(port, `/api/products/${product.lastID}/review-eligibility`);
    assert.equal(anonymous.response.status, 401, 'anonymous callers cannot inspect review eligibility');

    const unrelatedEligibility = await fetchJson(port, `/api/products/${product.lastID}/review-eligibility`, {
      headers: await sessionHeaders(unrelatedBuyer),
    });
    assert.equal(unrelatedEligibility.response.status, 200);
    assert.equal(unrelatedEligibility.body.eligible, false, 'a non-buyer cannot review');
    assert.equal(unrelatedEligibility.body.reason, 'delivery_required');

    const buyerHeaders = await sessionHeaders(deliveredBuyer);
    const deliveredEligibility = await fetchJson(port, `/api/products/${product.lastID}/review-eligibility`, { headers: buyerHeaders });
    assert.equal(deliveredEligibility.response.status, 200);
    assert.equal(deliveredEligibility.body.eligible, true, 'only delivered COD buyer is eligible');
    assert.equal(deliveredEligibility.body.orderId, order.lastID);

    const createdReview = await fetchJson(port, `/api/products/${product.lastID}/reviews`, {
      method: 'POST',
      headers: { ...buyerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5, comment: 'Delivered exactly as described.' }),
    });
    assert.equal(createdReview.response.status, 201, 'eligible buyer can write one review');
    assert.equal(createdReview.body.review.verifiedPurchase, true);
    assert.equal(createdReview.body.summary.reviewCount, 1);

    const replayReview = await fetchJson(port, `/api/products/${product.lastID}/reviews`, {
      method: 'POST',
      headers: { ...buyerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5, comment: 'Retry should not create a second review.' }),
    });
    assert.equal(replayReview.response.status, 409, 'review creation must be idempotent per buyer and product');

    const reviews = await fetchJson(port, `/api/products/${product.lastID}/reviews`);
    assert.equal(reviews.response.status, 200);
    assert.equal(reviews.body.reviews.length, 1);
    assert.equal(reviews.body.reviews[0].verified_purchase, 1, 'public review receives a verified-delivery badge');
    assert.equal(Object.hasOwn(reviews.body.reviews[0], 'order_id'), false, 'public review does not expose private order references');

    const storedProduct = await getStatement('SELECT rating, review_count FROM products WHERE id = ?', [product.lastID]);
    assert.equal(Number(storedProduct.rating), 5, 'review summary updates product rating');
    assert.equal(Number(storedProduct.review_count), 1, 'review summary updates product review count');
  } finally {
    await stopServer(server);
  }

  console.log('Delivered-order review and storefront smoke test passed.');
}

run()
  .then(closeDatabase)
  .catch(async (error) => {
    console.error(error.stack || error.message);
    await closeDatabase().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });
