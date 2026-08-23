const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-financial-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.CMI_STORE_KEY = 'test-store-key';
process.env.CMI_CLIENT_ID = 'test-client-id';
process.env.CLIENT_URL = 'https://www.rifkando.test';
process.env.BACKEND_URL = 'https://api.rifkando.test';
// Financial unit tests exercise preserved non-COD settlement code directly.
// Public checkout remains COD-only through its request validation and render config.
process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=true,wallet_payments=true,digital_downloads=true,courses=false,services=false,digital=true';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const WalletService = require('../src/services/walletService');
const CmiPaymentService = require('../src/services/cmiPaymentService');
const Money = require('../src/services/moneyService');

const closeDatabase = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

const createUsersAndProduct = async (title, price) => WalletService.withFinancialTransaction(async (tx) => {
  const buyer = await tx.run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'buyer')",
    [`${title} buyer`, `${title.replaceAll(' ', '-')}@buyer.test`, 'x']
  );
  const seller = await tx.run(
    "INSERT INTO users (name, email, password, role, seller_started_at) VALUES (?, ?, ?, 'seller', datetime('now', '-15 days'))",
    [`${title} seller`, `${title.replaceAll(' ', '-')}@seller.test`, 'x']
  );
  const product = await tx.run(
    "INSERT INTO products (title, price, seller_id, stock, status) VALUES (?, ?, ?, ?, 'published')",
    [title, price, seller.lastID, 5]
  );
  return { buyerId: buyer.lastID, sellerId: seller.lastID, productId: product.lastID };
});

const addressFor = (email) => ({
  fullName: 'Test Buyer',
  email,
  phone: '0600000000',
  address: '1 Test Street',
  city: 'Rabat',
  postalCode: '10000',
});

const signCmiCallback = (callback) => {
  callback.HASHPARAMS = 'oid:amount:clientid:currency:ProcReturnCode:';
  callback.HASHPARAMSVAL = `${callback.oid}${callback.amount}${callback.clientid}${callback.currency}${callback.ProcReturnCode}`;
  callback.HASH = crypto.createHash('sha512')
    .update(`${callback.HASHPARAMSVAL}test-store-key`, 'utf8')
    .digest('base64');
  return callback;
};

const run = async () => {
  await db.ready;

  const walletFlow = await createUsersAndProduct('Wallet product', 200);
  await WalletService.addFunds(
    walletFlow.buyerId, 1000, 'test_seed', 1, 'Test wallet funding', 'test-seed-credit:buyer:1001'
  );
  const orderResult = await WalletService.createMarketplaceOrder({
    buyerId: walletFlow.buyerId,
    orderNumber: 'RIF-TEST-WALLET-1001',
    paymentMethod: 'wallet',
    shippingAddress: addressFor('wallet-product@buyer.test'),
    items: [{ id: walletFlow.productId, quantity: 1, price: 0 }],
    expectedTotal: 250,
    idempotencyKey: 'test-wallet-checkout-request:1001',
  });
  const duplicateOrder = await WalletService.createMarketplaceOrder({
    buyerId: walletFlow.buyerId,
    orderNumber: 'RIF-TEST-WALLET-DUPLICATE',
    paymentMethod: 'wallet',
    shippingAddress: addressFor('wallet-product@buyer.test'),
    items: [{ id: walletFlow.productId, quantity: 1 }],
    expectedTotal: 250,
    idempotencyKey: 'test-wallet-checkout-request:1001',
  });
  assert.equal(duplicateOrder.alreadyCreated, true, 'checkout retry must return the original order');
  assert.equal(duplicateOrder.order.id, orderResult.order.id, 'checkout retry must not create another order');

  await WalletService.withFinancialTransaction((tx) => tx.run(
    "UPDATE orders SET status = 'shipped' WHERE id = ?", [orderResult.order.id]
  ));
  await WalletService.releaseOrderEscrowsAfterDelivery(orderResult.order.id, walletFlow.sellerId);
  const productEscrow = await WalletService.get(
    'SELECT commission_minor, seller_amount_minor FROM escrow_transactions WHERE order_id = ?',
    [orderResult.order.id]
  );
  assert.equal(productEscrow.commission_minor, 1000, 'physical products must use the 5% commission rate');
  assert.equal(productEscrow.seller_amount_minor, 19000);
  const withdrawal = await WalletService.requestWithdrawal(
    walletFlow.sellerId,
    100,
    'bank_transfer',
    { bank: 'Test Bank', account_name: 'Seller', account_number: '123' },
    'test-wallet-withdrawal-request:1001'
  );
  await WalletService.processWithdrawal({
    withdrawalId: withdrawal.requestId,
    action: 'approve',
    adminId: walletFlow.sellerId,
    providerReference: 'TEST-PAYOUT-1001',
  });
  const buyerWallet = await WalletService.getWallet(walletFlow.buyerId);
  const sellerWallet = await WalletService.getWallet(walletFlow.sellerId);
  assert.equal(buyerWallet.available_balance, 750);
  assert.equal(buyerWallet.available_balance_minor, 75000);
  assert.equal(sellerWallet.available_balance, 90);
  assert.equal(sellerWallet.available_balance_minor, 9000);
  assert.equal(sellerWallet.escrow_balance, 0);
  assert.equal(sellerWallet.pending_withdrawal, 0);

  const cmiFlow = await createUsersAndProduct('CMI product', 200);
  const cmiOrder = await WalletService.createMarketplaceOrder({
    buyerId: cmiFlow.buyerId,
    orderNumber: 'RIF-TEST-CMI-1001',
    paymentMethod: 'cmi',
    shippingAddress: addressFor('cmi-product@buyer.test'),
    items: [{ id: cmiFlow.productId, quantity: 1 }],
    expectedTotal: 250,
    idempotencyKey: 'test-cmi-checkout-request:1001',
  });
  const oid = 'CMI-TEST-ORDER-1001';
  await WalletService.withFinancialTransaction((tx) => tx.run(
    "INSERT INTO payment_transactions (order_id, cmi_oid, amount, amount_minor, status) VALUES (?, ?, ?, ?, 'pending')",
    [cmiOrder.order.id, oid, 250, 25000]
  ));
  const callback = signCmiCallback({
    oid,
    amount: '250.00',
    clientid: 'test-client-id',
    currency: '504',
    ProcReturnCode: '00',
  });
  await assert.rejects(
    CmiPaymentService.processSuccessPayment(oid, { ...callback, HASH: 'forged-signature' }),
    /Invalid CMI payment callback/,
    'a forged CMI callback must never change payment state'
  );
  await assert.rejects(
    CmiPaymentService.processSuccessPayment(oid, signCmiCallback({ ...callback, amount: '0.01' })),
    /amount does not match/,
    'a validly signed callback with the wrong amount must be rejected'
  );
  const firstCallback = await CmiPaymentService.processSuccessPayment(oid, callback);
  const secondCallback = await CmiPaymentService.processSuccessPayment(oid, callback);
  assert.equal(firstCallback.alreadyProcessed, false);
  assert.equal(secondCallback.alreadyProcessed, true, 'CMI callback must be idempotent');
  const cmiSellerWallet = await WalletService.getWallet(cmiFlow.sellerId);
  const persistedCmiOrder = await WalletService.get(
    'SELECT payment_status, status FROM orders WHERE id = ?', [cmiOrder.order.id]
  );
  assert.equal(persistedCmiOrder.payment_status, 'paid');
  assert.equal(persistedCmiOrder.status, 'processing');
  assert.equal(cmiSellerWallet.escrow_balance, 190);
  assert.equal(cmiSellerWallet.escrow_balance_minor, 19000);

  const newSeller = await WalletService.withFinancialTransaction((tx) => tx.run(
    "INSERT INTO users (name, email, password, role, seller_started_at) VALUES (?, ?, ?, 'seller', CURRENT_TIMESTAMP)",
    ['New seller', 'new-seller@test.local', 'x']
  ));
  await WalletService.addFunds(
    newSeller.lastID, 200, 'test_seed', 1, 'New seller funding', 'test-seed-credit:new-seller:1001'
  );
  await assert.rejects(
    WalletService.requestWithdrawal(
      newSeller.lastID,
      100,
      'bank_transfer',
      { bank: 'Test Bank', account_name: 'New Seller', account_number: '999' },
      'test-wallet-withdrawal-new-seller:1001'
    ),
    /New sellers can request withdrawals after 14 days/,
    'new sellers must not bypass the 14-day withdrawal hold'
  );

  const refundFlow = await createUsersAndProduct('Refund product', 200);
  await WalletService.addFunds(
    refundFlow.buyerId, 1000, 'test_seed', 1, 'Refund test funding', 'test-seed-credit:buyer:1002'
  );
  const refundableOrder = await WalletService.createMarketplaceOrder({
    buyerId: refundFlow.buyerId,
    orderNumber: 'RIF-TEST-REFUND-1001',
    paymentMethod: 'wallet',
    shippingAddress: addressFor('refund-product@buyer.test'),
    items: [{ id: refundFlow.productId, quantity: 1 }],
    expectedTotal: 250,
    idempotencyKey: 'test-refund-checkout-request:1001',
  });
  const refundRequest = await WalletService.requestRefund({
    orderId: refundableOrder.order.id,
    requesterId: refundFlow.buyerId,
    reason: 'Product arrived damaged.',
  });
  const duplicateRefundRequest = await WalletService.requestRefund({
    orderId: refundableOrder.order.id,
    requesterId: refundFlow.buyerId,
    reason: 'Product arrived damaged.',
  });
  assert.equal(duplicateRefundRequest.alreadyProcessed, true, 'refund requests must be idempotent');
  assert.equal(duplicateRefundRequest.requestId, refundRequest.requestId);
  const firstRefund = await WalletService.completeRefund({
    refundId: refundRequest.requestId,
    adminId: refundFlow.sellerId,
    notes: 'Approved after review.',
  });
  const duplicateRefund = await WalletService.completeRefund({
    refundId: refundRequest.requestId,
    adminId: refundFlow.sellerId,
  });
  assert.equal(firstRefund.alreadyProcessed, false);
  assert.equal(duplicateRefund.alreadyProcessed, true, 'refund completion must be idempotent');
  const refundedOrder = await WalletService.get(
    'SELECT payment_status, status FROM orders WHERE id = ?', [refundableOrder.order.id]
  );
  const refundedBuyerWallet = await WalletService.getWallet(refundFlow.buyerId);
  const refundedSellerWallet = await WalletService.getWallet(refundFlow.sellerId);
  assert.deepEqual(refundedOrder, { payment_status: 'refunded', status: 'cancelled' });
  assert.equal(refundedBuyerWallet.available_balance_minor, 100000, 'refund must restore the buyer balance exactly once');
  assert.equal(refundedSellerWallet.escrow_balance_minor, 0, 'refund must reverse unreleased seller escrow');

  const monetaryRows = await WalletService.all(`
    SELECT total_minor FROM orders
    UNION ALL SELECT price_minor FROM order_items
    UNION ALL SELECT amount_minor FROM payment_transactions
    UNION ALL SELECT amount_minor FROM payment_splits
    UNION ALL SELECT amount_minor FROM wallet_ledger_entries
  `);
  assert.equal(monetaryRows.every((row) => Number.isSafeInteger(row[Object.keys(row)[0]])), true, 'financial records must persist integer minor units');
  assert.equal(Money.toMinor('0.30'), 30);
  assert.equal(Money.toMinor(0.1 + 0.2), 30, 'browser floating-point artifacts are normalized at the boundary');
  assert.equal(Money.formatMinor(12345), '123.45');
  assert.throws(() => Money.toMinor('0.301'), /two decimal places/);

  console.log('Financial smoke test passed.');
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
