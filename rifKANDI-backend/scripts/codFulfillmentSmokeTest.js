const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-cod-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.CLIENT_URL = 'https://www.rifkando.test';
process.env.BACKEND_URL = 'https://api.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const WalletService = require('../src/services/walletService');
const CodFulfillmentService = require('../src/services/codFulfillmentService');

const closeDatabase = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));

const createUsersAndProduct = async (title, price = 100) => WalletService.withFinancialTransaction(async (tx) => {
  const buyer = await tx.run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'buyer')",
    [`${title} buyer`, `${title.replaceAll(' ', '-')}@buyer.test`, 'x']
  );
  const seller = await tx.run(
    "INSERT INTO users (name, email, password, role, seller_started_at) VALUES (?, ?, ?, 'seller', datetime('now', '-15 days'))",
    [`${title} seller`, `${title.replaceAll(' ', '-')}@seller.test`, 'x']
  );
  const finance = await tx.run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'finance')",
    [`${title} finance`, `${title.replaceAll(' ', '-')}@finance.test`, 'x']
  );
  const product = await tx.run(
    "INSERT INTO products (title, price, seller_id, stock, status) VALUES (?, ?, ?, ?, 'published')",
    [title, price, seller.lastID, 3]
  );
  return { buyerId: buyer.lastID, sellerId: seller.lastID, financeId: finance.lastID, productId: product.lastID };
});

const address = (email) => ({
  fullName: 'COD Test Buyer', email, phone: '0600000000', address: '1 Test Street', city: 'Rabat', postalCode: '10000',
});

async function run() {
  await db.ready;
  const flow = await createUsersAndProduct('COD product');
  const checkout = await WalletService.createMarketplaceOrder({
    buyerId: flow.buyerId,
    orderNumber: 'RIF-COD-1001',
    paymentMethod: 'cash',
    shippingAddress: address('cod-product@buyer.test'),
    items: [{ id: flow.productId, quantity: 1 }],
    expectedTotal: 150,
    idempotencyKey: 'cod-fulfillment-checkout-1001',
  });
  const fulfillment = await WalletService.get('SELECT * FROM cod_fulfillments WHERE order_id = ?', [checkout.order.id]);
  assert.equal(fulfillment.gross_amount_minor, 10_000);
  assert.equal(fulfillment.commission_minor, 500, 'product commission is exactly 5%');
  assert.equal(fulfillment.seller_amount_minor, 9_500);
  assert.equal(fulfillment.expected_cod_amount_minor, 15_000);

  await CodFulfillmentService.sellerAction({ fulfillmentId: fulfillment.id, sellerId: flow.sellerId, action: 'confirm' });
  await CodFulfillmentService.sellerAction({
    fulfillmentId: fulfillment.id,
    sellerId: flow.sellerId,
    action: 'dispatch',
    carrierName: 'Test Carrier',
    trackingNumber: 'COD-TRACK-1001',
  });
  const delivered = await CodFulfillmentService.confirmSellerManagedDelivery({
    fulfillmentId: fulfillment.id, financeUserId: flow.financeId, note: 'Carrier tracking confirms delivery.',
  });
  assert.equal(delivered.fulfillment.commission_payment_status, 'due');
  assert.ok(delivered.fulfillment.commission_reference);
  await assert.rejects(
    CodFulfillmentService.submitSellerManagedCommission({
      fulfillmentId: fulfillment.id, sellerId: flow.sellerId, paymentReference: '',
    }),
    /transfer reference is required/
  );
  await CodFulfillmentService.submitSellerManagedCommission({
    fulfillmentId: fulfillment.id, sellerId: flow.sellerId, paymentReference: 'ATW-COD-1001',
  });
  const settled = await CodFulfillmentService.verifySellerManagedCommission({
    fulfillmentId: fulfillment.id, financeUserId: flow.financeId, note: 'Matched with Attijari transaction.',
  });
  assert.equal(settled.alreadyProcessed, false);
  const replay = await CodFulfillmentService.verifySellerManagedCommission({
    fulfillmentId: fulfillment.id, financeUserId: flow.financeId,
  });
  assert.equal(replay.alreadyProcessed, true, 'commission verification is idempotent');
  const wallet = await WalletService.getWallet(flow.sellerId);
  assert.equal(wallet.available_balance_minor, 0, 'seller-managed COD never credits a rifKANDO wallet');

  const returnFlow = await createUsersAndProduct('Returned COD product');
  const returnCheckout = await WalletService.createMarketplaceOrder({
    buyerId: returnFlow.buyerId,
    orderNumber: 'RIF-COD-RETURN-1001',
    paymentMethod: 'cash',
    shippingAddress: address('returned-cod@buyer.test'),
    items: [{ id: returnFlow.productId, quantity: 1 }],
    expectedTotal: 150,
    idempotencyKey: 'cod-fulfillment-return-1001',
  });
  const returnFulfillment = await WalletService.get('SELECT * FROM cod_fulfillments WHERE order_id = ?', [returnCheckout.order.id]);
  await CodFulfillmentService.sellerAction({ fulfillmentId: returnFulfillment.id, sellerId: returnFlow.sellerId, action: 'confirm' });
  await CodFulfillmentService.sellerAction({
    fulfillmentId: returnFulfillment.id, sellerId: returnFlow.sellerId, action: 'dispatch', carrierName: 'Test Carrier', trackingNumber: 'COD-TRACK-RETURN-1001',
  });
  await CodFulfillmentService.recordException({
    fulfillmentId: returnFulfillment.id, financeUserId: returnFlow.financeId, status: 'returned', note: 'Carrier returned the parcel to the seller.',
  });
  const returnedProduct = await WalletService.get('SELECT stock, sold FROM products WHERE id = ?', [returnFlow.productId]);
  assert.equal(returnedProduct.stock, 3, 'a returned parcel restores stock');
  assert.equal(returnedProduct.sold, 0, 'a returned parcel reverses sold count');

  console.log('COD fulfilment smoke test passed.');
}

run()
  .then(closeDatabase)
  .catch(async (error) => { console.error(error.stack || error.message); await closeDatabase().catch(() => undefined); process.exitCode = 1; })
  .finally(async () => { await fs.rm(testDirectory, { recursive: true, force: true }); });
