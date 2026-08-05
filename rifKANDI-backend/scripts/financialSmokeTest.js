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
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const WalletService = require('../src/services/walletService');
const CmiPaymentService = require('../src/services/cmiPaymentService');

const closeDatabase = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

const createUsersAndProduct = async (title, price) => WalletService.withFinancialTransaction(async (tx) => {
  const buyer = await tx.run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'buyer')",
    [`${title} buyer`, `${title.replaceAll(' ', '-')}@buyer.test`, 'x']
  );
  const seller = await tx.run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'seller')",
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
  assert.equal(sellerWallet.available_balance, 80);
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
    "INSERT INTO payment_transactions (order_id, cmi_oid, amount, status) VALUES (?, ?, ?, 'pending')",
    [cmiOrder.order.id, oid, 250]
  ));
  const callback = {
    oid,
    amount: '250.00',
    clientid: 'test-client-id',
    currency: '504',
    ProcReturnCode: '00',
  };
  callback.HASHPARAMS = 'oid:amount:clientid:currency:ProcReturnCode:';
  callback.HASHPARAMSVAL = `${callback.oid}${callback.amount}${callback.clientid}${callback.currency}${callback.ProcReturnCode}`;
  callback.HASH = crypto.createHash('sha512')
    .update(`${callback.HASHPARAMSVAL}test-store-key`, 'utf8')
    .digest('base64');
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
  assert.equal(cmiSellerWallet.escrow_balance, 180);

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
