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
  const operations = await tx.run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'operations')",
    [`${title} operations`, `${title.replaceAll(' ', '-')}@operations.test`, 'x']
  );
  const product = await tx.run(
    "INSERT INTO products (title, price, seller_id, stock, status) VALUES (?, ?, ?, ?, 'published')",
    [title, price, seller.lastID, 3]
  );
  return {
    buyerId: buyer.lastID,
    sellerId: seller.lastID,
    financeId: finance.lastID,
    operationsId: operations.lastID,
    productId: product.lastID,
  };
});

const address = (email) => ({
  fullName: 'COD Test Buyer', email, phone: '0600000000', address: '1 Test Street', city: 'Rabat', postalCode: '10000',
});
const deliveryDeadline = () => new Date(Date.now() + (48 * 60 * 60 * 1000)).toISOString();

async function run() {
  await db.ready;
  const flow = await createUsersAndProduct('COD product');
  const checkout = await WalletService.createMarketplaceOrder({
    buyerId: flow.buyerId,
    orderNumber: 'RIF-COD-1001',
    paymentMethod: 'cash',
    shippingAddress: address('cod-product@buyer.test'),
    items: [{ id: flow.productId, quantity: 1 }],
    expectedTotal: 100,
    idempotencyKey: 'cod-fulfillment-checkout-1001',
  });
  const fulfillment = await WalletService.get('SELECT * FROM cod_fulfillments WHERE order_id = ?', [checkout.order.id]);
  assert.equal(fulfillment.gross_amount_minor, 10_000);
  assert.equal(fulfillment.commission_minor, 500, 'product commission is exactly 5%');
  assert.equal(fulfillment.seller_amount_minor, 9_500);
  assert.equal(fulfillment.expected_cod_amount_minor, 10_000, 'checkout starts without a seller-defined delivery fee');

  await CodFulfillmentService.sellerAction({ fulfillmentId: fulfillment.id, sellerId: flow.sellerId, action: 'confirm' });
  await assert.rejects(
    () => CodFulfillmentService.sellerAction({
      fulfillmentId: fulfillment.id, sellerId: flow.sellerId, action: 'dispatch',
    }),
    /Unsupported COD fulfilment action/,
    'a seller cannot bypass Toufiq and mark a parcel as dispatched'
  );
  await CodFulfillmentService.sellerAction({
    fulfillmentId: fulfillment.id, sellerId: flow.sellerId, action: 'request_handoff',
  });
  await assert.rejects(
    () => CodFulfillmentService.confirmDeliveryPartnerPickup({
      fulfillmentId: fulfillment.id, operationsUserId: flow.operationsId,
      carrierName: 'Najm Chamal', trackingNumber: 'COD-TRACK-1001', note: 'Toufiq collected the parcel.',
    }),
    /delivery quote/,
    'Toufiq cannot confirm pickup before setting the buyer delivery quote'
  );
  const quoted = await CodFulfillmentService.quoteDeliveryFee({
    fulfillmentId: fulfillment.id, operationsUserId: flow.operationsId, deliveryFee: 50,
    deliveryDeadline: deliveryDeadline(),
    note: 'Parcel and destination confirmed by Toufiq.',
  });
  assert.equal(quoted.fulfillment.expected_cod_amount_minor, 15_000, 'the quote updates the COD amount before pickup');
  assert.ok(quoted.fulfillment.delivery_deadline_at, 'Toufiq sets the buyer delivery deadline with the quote');
  const pickedUp = await CodFulfillmentService.confirmDeliveryPartnerPickup({
    fulfillmentId: fulfillment.id, operationsUserId: flow.operationsId,
    carrierName: 'Najm Chamal', trackingNumber: 'COD-TRACK-1001', note: 'Toufiq collected the parcel.',
  });
  assert.equal(pickedUp.fulfillment.status, 'shipped');
  const reported = await CodFulfillmentService.reportDeliveryOutcome({
    fulfillmentId: fulfillment.id, operationsUserId: flow.operationsId,
    outcome: 'delivered', note: 'Buyer accepted the parcel. Carrier collection is awaiting finance evidence.',
  });
  assert.equal(reported.fulfillment.status, 'shipped', 'an operations report must not settle or collect COD money');
  assert.equal(reported.fulfillment.delivery_report_outcome, 'delivered');
  await assert.rejects(
    () => CodFulfillmentService.recordCollection({
      fulfillmentId: fulfillment.id, financeUserId: flow.financeId,
      carrierReference: 'INVALID-FEE-1001', collectedAmount: 150, carrierDeliveryFee: 49,
    }),
    /quote recorded by COD Operations/,
    'a collection cannot change Toufiq\'s recorded delivery quote'
  );
  const collected = await CodFulfillmentService.recordCollection({
    fulfillmentId: fulfillment.id, financeUserId: flow.financeId,
    carrierReference: 'NAJM-COLLECT-1001', collectedAmount: 150, carrierDeliveryFee: 50,
  });
  assert.equal(collected.fulfillment.status, 'delivered');
  const remitted = await CodFulfillmentService.recordDeliveryPartnerRemittance({
    fulfillmentId: fulfillment.id, financeUserId: flow.financeId,
    settlementReference: 'TOUFIQ-REM-1001', remittedAmount: 100,
  });
  assert.equal(remitted.fulfillment.seller_payout_status, 'due');
  const paid = await CodFulfillmentService.recordManualSellerPayout({
    fulfillmentId: fulfillment.id, financeUserId: flow.financeId, payoutReference: 'ATW-SELLER-1001',
  });
  assert.equal(paid.fulfillment.seller_payout_status, 'paid');
  const replay = await CodFulfillmentService.recordManualSellerPayout({
    fulfillmentId: fulfillment.id, financeUserId: flow.financeId, payoutReference: 'ATW-SELLER-1001',
  });
  assert.equal(replay.alreadyProcessed, true, 'seller payout recording is idempotent');
  const wallet = await WalletService.getWallet(flow.sellerId);
  assert.equal(wallet.available_balance_minor, 0, 'manual COD seller payout never credits a rifKANDO wallet');

  // Removing a listing before the delivery partner collects it follows the
  // same seller cancellation path. It must void settlement so the parcel is
  // not shown in Operations or Reconciliation queues.
  const cancellationFlow = await createUsersAndProduct('Cancelled before pickup COD product');
  const cancellationCheckout = await WalletService.createMarketplaceOrder({
    buyerId: cancellationFlow.buyerId,
    orderNumber: 'RIF-COD-CANCEL-1001',
    paymentMethod: 'cash',
    shippingAddress: address('cancelled-cod@buyer.test'),
    items: [{ id: cancellationFlow.productId, quantity: 1 }],
    expectedTotal: 100,
    idempotencyKey: 'cod-fulfillment-cancel-1001',
  });
  const cancellationFulfillment = await WalletService.get('SELECT * FROM cod_fulfillments WHERE order_id = ?', [cancellationCheckout.order.id]);
  await CodFulfillmentService.sellerAction({ fulfillmentId: cancellationFulfillment.id, sellerId: cancellationFlow.sellerId, action: 'confirm' });
  const cancelled = await CodFulfillmentService.sellerAction({
    fulfillmentId: cancellationFulfillment.id,
    sellerId: cancellationFlow.sellerId,
    action: 'cancel',
    note: 'Listing removed before pickup.',
  });
  assert.equal(cancelled.fulfillment.status, 'cancelled', 'a pre-pickup listing removal cancels its COD fulfilment');
  assert.equal(cancelled.fulfillment.settlement_status, 'void', 'a cancelled COD fulfilment cannot appear in financial reconciliation');
  const cancelledOrder = await WalletService.get('SELECT status, payment_status FROM orders WHERE id = ?', [cancellationCheckout.order.id]);
  assert.equal(cancelledOrder.status, 'cancelled');
  assert.equal(cancelledOrder.payment_status, 'cancelled');

  const duplicateRemittanceFlow = await createUsersAndProduct('Duplicate remittance COD product');
  const duplicateRemittanceCheckout = await WalletService.createMarketplaceOrder({
    buyerId: duplicateRemittanceFlow.buyerId,
    orderNumber: 'RIF-COD-DUPLICATE-REM-1001',
    paymentMethod: 'cash',
    shippingAddress: address('duplicate-remittance@buyer.test'),
    items: [{ id: duplicateRemittanceFlow.productId, quantity: 1 }],
    expectedTotal: 100,
    idempotencyKey: 'cod-fulfillment-duplicate-remittance-1001',
  });
  const duplicateRemittanceFulfillment = await WalletService.get('SELECT * FROM cod_fulfillments WHERE order_id = ?', [duplicateRemittanceCheckout.order.id]);
  await CodFulfillmentService.sellerAction({ fulfillmentId: duplicateRemittanceFulfillment.id, sellerId: duplicateRemittanceFlow.sellerId, action: 'confirm' });
  await CodFulfillmentService.sellerAction({ fulfillmentId: duplicateRemittanceFulfillment.id, sellerId: duplicateRemittanceFlow.sellerId, action: 'request_handoff' });
  await CodFulfillmentService.quoteDeliveryFee({
    fulfillmentId: duplicateRemittanceFulfillment.id, operationsUserId: duplicateRemittanceFlow.operationsId, deliveryFee: 50,
    deliveryDeadline: deliveryDeadline(),
  });
  await CodFulfillmentService.confirmDeliveryPartnerPickup({
    fulfillmentId: duplicateRemittanceFulfillment.id, operationsUserId: duplicateRemittanceFlow.operationsId,
    carrierName: 'Najm Chamal', trackingNumber: 'COD-TRACK-DUPLICATE-REM-1001',
  });
  await CodFulfillmentService.recordCollection({
    fulfillmentId: duplicateRemittanceFulfillment.id, financeUserId: duplicateRemittanceFlow.financeId,
    carrierReference: 'NAJM-COLLECT-DUPLICATE-REM-1001', collectedAmount: 150, carrierDeliveryFee: 50,
  });
  await assert.rejects(
    () => CodFulfillmentService.recordDeliveryPartnerRemittance({
      fulfillmentId: duplicateRemittanceFulfillment.id, financeUserId: duplicateRemittanceFlow.financeId,
      settlementReference: 'TOUFIQ-REM-1001', remittedAmount: 100,
    }),
    /already linked to another fulfilment/,
    'a Toufiq remittance reference cannot be reused for another fulfilment'
  );

  const returnFlow = await createUsersAndProduct('Returned COD product');
  const returnCheckout = await WalletService.createMarketplaceOrder({
    buyerId: returnFlow.buyerId,
    orderNumber: 'RIF-COD-RETURN-1001',
    paymentMethod: 'cash',
    shippingAddress: address('returned-cod@buyer.test'),
    items: [{ id: returnFlow.productId, quantity: 1 }],
    expectedTotal: 100,
    idempotencyKey: 'cod-fulfillment-return-1001',
  });
  const returnFulfillment = await WalletService.get('SELECT * FROM cod_fulfillments WHERE order_id = ?', [returnCheckout.order.id]);
  await CodFulfillmentService.sellerAction({ fulfillmentId: returnFulfillment.id, sellerId: returnFlow.sellerId, action: 'confirm' });
  await CodFulfillmentService.sellerAction({ fulfillmentId: returnFulfillment.id, sellerId: returnFlow.sellerId, action: 'request_handoff' });
  await assert.rejects(
    () => CodFulfillmentService.quoteDeliveryFee({
      fulfillmentId: returnFulfillment.id, operationsUserId: returnFlow.operationsId, deliveryFee: 50,
      deliveryDeadline: new Date(Date.now() - (10 * 60 * 1000)).toISOString(),
    }),
    /between now and 90 days/,
    'delivery deadlines cannot be set in the past'
  );
  await CodFulfillmentService.quoteDeliveryFee({
    fulfillmentId: returnFulfillment.id, operationsUserId: returnFlow.operationsId, deliveryFee: 50,
    deliveryDeadline: deliveryDeadline(),
  });
  await CodFulfillmentService.confirmDeliveryPartnerPickup({
    fulfillmentId: returnFulfillment.id, operationsUserId: returnFlow.operationsId,
    carrierName: 'Test Carrier', trackingNumber: 'COD-TRACK-RETURN-1001',
  });
  await CodFulfillmentService.reportDeliveryOutcome({
    fulfillmentId: returnFulfillment.id, operationsUserId: returnFlow.operationsId,
    outcome: 'refused', note: 'Buyer refused the parcel at delivery.',
  });
  await assert.rejects(
    () => CodFulfillmentService.recordCollection({
      fulfillmentId: returnFulfillment.id, financeUserId: returnFlow.financeId,
      carrierReference: 'INVALID-COLLECTION-RETURN-1001', collectedAmount: 150, carrierDeliveryFee: 50,
    }),
    /matching delivery exception/,
    'a refused field report must block cash collection'
  );
  await CodFulfillmentService.recordException({
    fulfillmentId: returnFulfillment.id, financeUserId: returnFlow.financeId, status: 'refused', note: 'Finance verified the carrier refusal evidence.',
  });
  const refusedOrder = await WalletService.get('SELECT status, payment_status FROM orders WHERE id = ?', [returnCheckout.order.id]);
  assert.equal(refusedOrder.status, 'refused', 'a fully refused COD order is visible to the buyer as refused');
  assert.equal(refusedOrder.payment_status, 'cancelled', 'a refused COD order cannot be collected');
  await CodFulfillmentService.recordException({
    fulfillmentId: returnFulfillment.id, financeUserId: returnFlow.financeId, status: 'returned', note: 'Carrier returned the parcel to the seller.',
  });
  const returnedProduct = await WalletService.get('SELECT stock, sold FROM products WHERE id = ?', [returnFlow.productId]);
  const returnedOrder = await WalletService.get('SELECT status, payment_status FROM orders WHERE id = ?', [returnCheckout.order.id]);
  assert.equal(returnedOrder.status, 'returned', 'a returned COD order is visible to the buyer as returned');
  assert.equal(returnedProduct.stock, 3, 'a returned parcel restores stock');
  assert.equal(returnedProduct.sold, 0, 'a returned parcel reverses sold count');

  console.log('COD fulfilment smoke test passed.');
}

run()
  .then(closeDatabase)
  .catch(async (error) => { console.error(error.stack || error.message); await closeDatabase().catch(() => undefined); process.exitCode = 1; })
  .finally(async () => { await fs.rm(testDirectory, { recursive: true, force: true }); });
