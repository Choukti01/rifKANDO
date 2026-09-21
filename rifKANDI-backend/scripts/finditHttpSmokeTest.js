const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const testDirectory = path.join(os.tmpdir(), `rifkando-findit-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.UPLOADS_DIR = path.join(testDirectory, 'uploads');
process.env.OBJECT_STORAGE_DRIVER = 'local';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-findit-tests';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-findit-tests';
process.env.AUDIT_LOG_SECRET = 'test-audit-secret-that-is-long-enough-for-findit-tests';
process.env.CLIENT_URL = 'https://www.rifkando.test';
process.env.BACKEND_URL = 'https://api.rifkando.test';
process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=false,courses=false,services=false,digital=false';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const { establishTestSessionForEmail } = require('./helpers/testSession');

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) reject(error);
    else resolve({ lastID: this.lastID, changes: this.changes });
  });
});
const getRow = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row))));
const closeDatabase = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
const startServer = () => new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
const stopServer = (server) => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
const cookiesFrom = (response) => (typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [response.headers.get('set-cookie')].filter(Boolean)).map((value) => value.split(';')[0]);
const request = (port, pathname, { method = 'GET', cookies = [], csrfToken, body, headers = {} } = {}) => {
  const requestHeaders = { Origin: 'https://www.rifkando.test', ...headers };
  if (cookies.length) requestHeaders.Cookie = cookies.join('; ');
  if (csrfToken) requestHeaders['X-CSRF-Token'] = csrfToken;
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  return fetch(`http://127.0.0.1:${port}${pathname}`, { method, headers: requestHeaders, body: body === undefined ? undefined : JSON.stringify(body) });
};
const login = async (_port, email, _password) => establishTestSessionForEmail(db, email);

const shippingAddress = {
  fullName: 'FINDit Buyer', email: 'buyer@example.test', phone: '+212600000000',
  address: '12 Test Street', city: 'Tangier', postalCode: '90000',
};

async function run() {
  await db.ready;
  const password = 'correct horse battery staple';
  const hash = await bcrypt.hash(password, 12);
  await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'buyer', 1)", ['FINDit Buyer', 'buyer@example.test', hash]);
  await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'buyer', 1)", ['Other Buyer', 'other-buyer@example.test', hash]);
  const seller = await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'seller', 1)", ['Parts Seller', 'seller@example.test', hash]);
  await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'seller', 1)", ['Other Seller', 'other-seller@example.test', hash]);
  await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'finance', 1)", ['Finance Operator', 'finance@example.test', hash]);
  const server = await startServer();
  const port = server.address().port;
  try {
    const buyerSession = await login(port, 'buyer@example.test', password);
    const otherBuyerSession = await login(port, 'other-buyer@example.test', password);
    const sellerSession = await login(port, 'seller@example.test', password);
    const otherSellerSession = await login(port, 'other-seller@example.test', password);
    const financeSession = await login(port, 'finance@example.test', password);

    const create = await request(port, '/api/findit/requests', {
      method: 'POST', cookies: buyerSession.cookies, csrfToken: buyerSession.csrfToken,
      body: {
        title: 'Front headlight for 2016 Dacia Logan',
        description: 'I need the left front headlight for a 2016 Dacia Logan in good condition.',
        category: 'Auto & Parts', city: 'Tangier', preferred_condition: 'used', budget_max: 2500.15,
        expires_in_days: 7, media: [{ url: '/uploads/findit-reference-images/test-reference.jpg', type: 'image' }],
      },
    });
    assert.equal(create.status, 201, 'buyer can create an independent FINDit request');
    const requestPayload = await create.json();
    const finditRequest = requestPayload.request;

    const publicCatalog = await request(port, '/api/findit/requests');
    assert.equal(publicCatalog.status, 200);
    const publicRequest = (await publicCatalog.json()).requests.find((item) => item.id === finditRequest.id);
    assert.ok(publicRequest, 'new request is visible in the FINDit board');
    assert.equal(publicRequest.buyer_id, undefined, 'public FINDit board must not disclose buyer identity');
    assert.equal(publicRequest.email, undefined, 'public FINDit board must not disclose buyer email');
    assert.equal(publicRequest.phone, undefined, 'public FINDit board must not disclose buyer phone');

    const offerCreate = await request(port, `/api/findit/requests/${finditRequest.id}/offers`, {
      method: 'POST', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken,
      body: {
        title: 'Compatible original left headlight',
        description: 'Original compatible part, inspected and ready to ship from Tangier.',
        price: 2000, delivery_fee: 50, condition: 'used', estimated_delivery_days: 2,
      },
    });
    assert.equal(offerCreate.status, 201, 'seller can send a private FINDit solution');
    const offer = (await offerCreate.json()).offer;
    const duplicateOffer = await request(port, `/api/findit/requests/${finditRequest.id}/offers`, {
      method: 'POST', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken,
      body: { title: 'Duplicate', description: 'This duplicate offer must be blocked.', price: 1900, delivery_fee: 0, condition: 'used', estimated_delivery_days: 2 },
    });
    assert.equal(duplicateOffer.status, 409, 'one seller may have only one active solution per request');

    const buyerDashboard = await request(port, '/api/findit/my-requests', { cookies: buyerSession.cookies });
    const buyerRequest = (await buyerDashboard.json()).requests.find((item) => item.id === finditRequest.id);
    assert.equal(buyerRequest.offers.length, 1, 'buyer sees the seller solution in the private dashboard');
    assert.equal(buyerRequest.offers[0].seller.email, undefined, 'buyer dashboard does not reveal seller email');

    const attackerCheckout = await request(port, `/api/findit/offers/${offer.id}/checkout`, {
      method: 'POST', cookies: otherBuyerSession.cookies, csrfToken: otherBuyerSession.csrfToken,
      headers: { 'Idempotency-Key': 'findit-attacker-checkout-key' }, body: { shippingAddress, notes: '' },
    });
    assert.equal(attackerCheckout.status, 404, 'another buyer cannot accept somebody else\'s FINDit offer');

    const checkoutKey = 'findit-buyer-checkout-key';
    const checkout = await request(port, `/api/findit/offers/${offer.id}/checkout`, {
      method: 'POST', cookies: buyerSession.cookies, csrfToken: buyerSession.csrfToken,
      headers: { 'Idempotency-Key': checkoutKey }, body: { shippingAddress, notes: 'Call before delivery.' },
    });
    assert.equal(checkout.status, 201, 'buyer can accept an offer into a cash-on-delivery order');
    const order = (await checkout.json()).order;
    assert.equal(order.type, 'findit');
    assert.equal(order.total, 2050);

    const replay = await request(port, `/api/findit/offers/${offer.id}/checkout`, {
      method: 'POST', cookies: buyerSession.cookies, csrfToken: buyerSession.csrfToken,
      headers: { 'Idempotency-Key': checkoutKey }, body: { shippingAddress, notes: 'Call before delivery.' },
    });
    assert.equal(replay.status, 200, 'checkout retry is idempotent');
    assert.equal((await replay.json()).order.id, order.id, 'retry returns the original FINDit order');

    const financialSnapshot = await getRow('SELECT * FROM findit_orders WHERE order_id = ?', [order.id]);
    assert.equal(financialSnapshot.commission_minor, 10_000, 'FINDit commission must be exactly 5% of the item price');
    assert.equal(financialSnapshot.seller_amount_minor, 190_000, 'seller amount excludes only the 5% FINDit commission');
    const platformSplit = await getRow("SELECT amount_minor FROM payment_splits WHERE order_id = ? AND party_type = 'platform'", [order.id]);
    assert.equal(platformSplit.amount_minor, 10_000, 'platform payment split keeps the 5% commission snapshot');

    const fulfillment = await getRow('SELECT * FROM cod_fulfillments WHERE order_id = ?', [order.id]);
    assert.ok(fulfillment, 'FINDit COD checkout creates an immutable fulfilment record');
    assert.equal(fulfillment.expected_cod_amount_minor, 205_000, 'COD record includes item price and the buyer delivery fee');

    const legacyStatus = await request(port, `/api/orders/${order.id}/status`, {
      method: 'PATCH', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken, body: { status: 'processing' },
    });
    assert.equal(legacyStatus.status, 403, 'sellers cannot use the general order status endpoint');
    const unauthorizedAction = await request(port, `/api/seller/cod-fulfillments/${fulfillment.id}`, {
      method: 'PATCH', cookies: otherSellerSession.cookies, csrfToken: otherSellerSession.csrfToken, body: { action: 'confirm' },
    });
    assert.equal(unauthorizedAction.status, 400, 'unrelated sellers cannot fulfil a FINDit order');
    const confirmed = await request(port, `/api/seller/cod-fulfillments/${fulfillment.id}`, {
      method: 'PATCH', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken, body: { action: 'confirm' },
    });
    assert.equal(confirmed.status, 200, 'selected FINDit seller can confirm the COD order');
    const dispatched = await request(port, `/api/seller/cod-fulfillments/${fulfillment.id}`, {
      method: 'PATCH', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken,
      body: { action: 'dispatch', carrierName: 'Test Carrier', trackingNumber: 'TRACK-FINDIT-1001' },
    });
    assert.equal(dispatched.status, 200, 'selected FINDit seller must attach tracking before dispatching');
    const delivery = await request(port, `/api/admin/cod-fulfillments/${fulfillment.id}/confirm-delivery`, {
      method: 'POST', cookies: financeSession.cookies, csrfToken: financeSession.csrfToken,
      body: { note: 'Carrier tracking confirmed as delivered.' },
    });
    assert.equal(delivery.status, 200, 'finance confirms delivery before commission is payable');
    const dueFulfillment = await getRow('SELECT commission_payment_status, commission_reference FROM cod_fulfillments WHERE id = ?', [fulfillment.id]);
    assert.equal(dueFulfillment.commission_payment_status, 'due');
    assert.ok(dueFulfillment.commission_reference, 'delivery creates an immutable commission reference');
    const payment = await request(port, `/api/seller/cod-fulfillments/${fulfillment.id}/submit-commission`, {
      method: 'POST', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken,
      body: { paymentReference: 'ATW-FINDIT-1001', note: 'Sent from Attijari.' },
    });
    assert.equal(payment.status, 200, 'seller can submit a commission transfer reference');
    const verified = await request(port, `/api/admin/cod-fulfillments/${fulfillment.id}/verify-commission`, {
      method: 'POST', cookies: financeSession.cookies, csrfToken: financeSession.csrfToken,
      body: { note: 'Matched with Attijari transaction.' },
    });
    assert.equal(verified.status, 200, 'finance verifies the actual commission transfer');
    const settledFulfillment = await getRow('SELECT settlement_status, commission_payment_status FROM cod_fulfillments WHERE id = ?', [fulfillment.id]);
    assert.equal(settledFulfillment.settlement_status, 'settled');
    assert.equal(settledFulfillment.commission_payment_status, 'paid');
    const sellerWallet = await getRow('SELECT available_balance_minor FROM wallets WHERE user_id = ?', [seller.lastID]);
    assert.equal(sellerWallet?.available_balance_minor ?? 0, 0, 'seller-managed COD never credits a rifKANDO wallet');

    const details = await request(port, `/api/orders/${order.id}`, { cookies: buyerSession.cookies });
    const detailsPayload = await details.json();
    assert.equal(details.status, 200);
    assert.equal(detailsPayload.order.order_type, 'findit');
    assert.equal(detailsPayload.order.items[0].title, 'Compatible original left headlight', 'buyer order page uses the immutable FINDit item snapshot');
    assert.equal(detailsPayload.order.fulfillments[0].tracking_number, 'TRACK-FINDIT-1001', 'buyer can see the carrier tracking number');
    const sellerOrders = await request(port, '/api/seller/orders', { cookies: sellerSession.cookies });
    assert.equal((await sellerOrders.json()).orders.some((item) => item.order_id === order.id && item.fulfillment_source === 'findit'), true, 'seller dashboard includes FINDit orders');
    const bookingEndpoint = await request(port, '/api/bookings');
    assert.equal(bookingEndpoint.status, 404, 'retired booking API is no longer mounted');
  } finally { await stopServer(server); }
  console.log('FINDit HTTP smoke test passed.');
}

run()
  .then(closeDatabase)
  .catch(async (error) => { console.error(error.stack || error.message); await closeDatabase().catch(() => undefined); process.exitCode = 1; })
  .finally(async () => { await fs.rm(testDirectory, { recursive: true, force: true }); });
