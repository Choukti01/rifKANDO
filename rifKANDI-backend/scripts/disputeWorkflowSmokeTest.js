const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-disputes-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_ENGINE = 'sqlite';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'dispute-workflow-test-secret-that-is-long-enough';
process.env.SESSION_SECRET = 'dispute-workflow-session-secret-that-is-long-enough';
process.env.AUDIT_LOG_SECRET = 'dispute-workflow-audit-secret-that-is-long-enough';
process.env.CLIENT_URL = 'https://www.rifkando.test';
process.env.COD_RECONCILIATION_ALLOWED_EMAILS = 'controller@dispute.test';
process.env.COD_OPERATIONS_ALLOWED_EMAILS = 'operations@dispute.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const CodFulfillmentService = require('../src/services/codFulfillmentService');
const { establishTestSessionForEmail } = require('./helpers/testSession');
let phoneSuffix = 1;

const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function onRun(error) {
  if (error) reject(error); else resolve({ lastID: this.lastID, changes: this.changes });
}));
const closeDatabase = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
const start = () => new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
const stop = (server) => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
const fetchJson = async (port, pathname, options = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, options);
  return { response, body: await response.json() };
};

const createUser = async (name, role, email) => {
  const result = await run('INSERT INTO users (name, email, password, phone, role, city) VALUES (?, ?, ?, ?, ?, ?)', [name, email, 'not-used', `06${String(phoneSuffix++).padStart(8, '0')}`, role, 'Nador']);
  return { id: result.lastID, email };
};
const headersFor = async (user) => {
  const session = await establishTestSessionForEmail(db, user.email);
  return { Cookie: session.cookies.join('; '), 'X-CSRF-Token': session.csrfToken };
};

async function main() {
  await db.ready;
  const buyer = await createUser('Dispute Buyer', 'buyer', 'buyer@dispute.test');
  const seller = await createUser('Dispute Seller', 'seller', 'seller@dispute.test');
  const outsider = await createUser('Dispute Outsider', 'buyer', 'outsider@dispute.test');
  const controller = await createUser('Dispute Controller', 'buyer', 'controller@dispute.test');
  const product = await run("INSERT INTO products (title, description, price, price_minor, seller_id, stock, status) VALUES (?, ?, ?, ?, ?, ?, 'published')", ['Dispute product', 'A product used to prove delivery dispute access.', 100, 10_000, seller.id, 2]);
  const order = await run("INSERT INTO orders (order_number, user_id, total, total_minor, order_type, status, payment_method, payment_status) VALUES (?, ?, ?, ?, 'product', 'shipped', 'cash', 'pending')", ['RIF-DISPUTE-1001', buyer.id, 100, 10_000]);
  await run('INSERT INTO order_items (order_id, product_id, product_title, quantity, price, price_minor) VALUES (?, ?, ?, ?, ?, ?)', [order.lastID, product.lastID, 'Dispute product', 1, 100, 10_000]);
  const fulfillment = await run(`INSERT INTO cod_fulfillments (order_id, seller_id, source, status, settlement_status, gross_amount, gross_amount_minor, expected_cod_amount, expected_cod_amount_minor, commission, commission_minor, seller_amount, seller_amount_minor) VALUES (?, ?, 'product', 'shipped', 'awaiting_delivery', ?, ?, ?, ?, ?, ?, ?, ?)`, [order.lastID, seller.id, 100, 10_000, 100, 10_000, 5, 500, 95, 9_500]);

  const server = await start();
  const port = server.address().port;
  try {
    const buyerHeaders = await headersFor(buyer);
    const sellerHeaders = await headersFor(seller);
    const outsiderHeaders = await headersFor(outsider);
    const controllerHeaders = await headersFor(controller);

    const forbidden = await fetchJson(port, `/api/fulfillments/${fulfillment.lastID}/disputes`, { method: 'POST', headers: { ...outsiderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'damaged', description: 'The item arrived visibly damaged.' }) });
    assert.equal(forbidden.response.status, 403, 'non-participants cannot open a delivery dispute');

    const opened = await fetchJson(port, `/api/fulfillments/${fulfillment.lastID}/disputes`, { method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'damaged', description: 'The item arrived visibly damaged during delivery.' }) });
    assert.equal(opened.response.status, 201, 'buyer can open a dispute for a shipped parcel');
    const disputeId = opened.body.dispute.id;
    assert.equal(opened.body.dispute.events.length, 1, 'opening creates an immutable case event');

    const duplicate = await fetchJson(port, `/api/fulfillments/${fulfillment.lastID}/disputes`, { method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'damaged', description: 'A duplicate should be rejected.' }) });
    assert.equal(duplicate.response.status, 409, 'only one active dispute may exist per parcel');

    await assert.rejects(
      () => CodFulfillmentService.recordCollection({
        fulfillmentId: fulfillment.lastID,
        financeUserId: controller.id,
        carrierReference: 'DISPUTE-COLLECTION-001',
        collectedAmount: 100,
        carrierDeliveryFee: 0,
        note: 'This must be blocked while the buyer case remains open.',
      }),
      /active dispute/,
      'an active dispute blocks financial collection before cash is recorded'
    );

    const sellerReply = await fetchJson(port, `/api/disputes/${disputeId}/messages`, { method: 'POST', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Seller confirms the parcel left in good condition.' }) });
    assert.equal(sellerReply.response.status, 200, 'seller can reply to their own dispute');

    const teamList = await fetchJson(port, '/api/disputes/team', { headers: controllerHeaders });
    assert.equal(teamList.response.status, 200, 'named reconciliation controller can access team disputes');
    assert.equal(teamList.body.canResolve, true);

    const decision = await fetchJson(port, `/api/disputes/${disputeId}/decision`, { method: 'PATCH', headers: { ...controllerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'return_required', resolution: 'Return is required after carrier evidence was reviewed.' }) });
    assert.equal(decision.response.status, 200, 'reconciliation controller can record a decision');
    assert.equal(decision.body.dispute.status, 'return_required');

    const returnDuplicate = await fetchJson(port, `/api/fulfillments/${fulfillment.lastID}/disputes`, { method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'damaged', description: 'A return-required case must still be the only active case.' }) });
    assert.equal(returnDuplicate.response.status, 409, 'a return-required case remains the single active case for its parcel');

    await assert.rejects(
      () => CodFulfillmentService.recordCollection({
        fulfillmentId: fulfillment.lastID,
        financeUserId: controller.id,
        carrierReference: 'DISPUTE-COLLECTION-002',
        collectedAmount: 100,
        carrierDeliveryFee: 0,
        note: 'This must remain blocked until the required return is completed.',
      }),
      /active dispute/,
      'a return-required dispute continues to block financial collection'
    );

    const closedMessage = await fetchJson(port, `/api/disputes/${disputeId}/messages`, { method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'This message must not be accepted after resolution.' }) });
    assert.equal(closedMessage.response.status, 409, 'resolved disputes reject new participant messages');
  } finally { await stop(server); }
  console.log('COD dispute workflow smoke test passed.');
}

main()
  .then(closeDatabase)
  .catch(async (error) => { console.error(error.stack || error.message); await closeDatabase().catch(() => undefined); process.exitCode = 1; })
  .finally(async () => { await fs.rm(testDirectory, { recursive: true, force: true }); });
