const db = require('../config/database');

const WALLET_ACCOUNTS = new Set([
  'available_balance',
  'escrow_balance',
  'pending_withdrawal',
]);

const PLATFORM_COMMISSION_RATE = 0.10;
const MAX_MONETARY_AMOUNT = 10000000;

class WalletService {
  // SQLite uses one shared connection in this application. Serialising financial
  // transactions here prevents two balance-changing requests from interleaving.
  static transactionTail = Promise.resolve();

  static run(sql, parameters = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, parameters, function onRun(error) {
        if (error) reject(error);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }

  static get(sql, parameters = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, parameters, (error, row) => {
        if (error) reject(error);
        else resolve(row);
      });
    });
  }

  static all(sql, parameters = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, parameters, (error, rows) => {
        if (error) reject(error);
        else resolve(rows);
      });
    });
  }

  static money(value, { allowZero = false, allowNegative = false } = {}) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || Math.abs(amount) > MAX_MONETARY_AMOUNT) {
      throw new Error('Invalid monetary amount.');
    }

    const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
    if (
      (!allowNegative && !allowZero && rounded <= 0) ||
      (!allowNegative && allowZero && rounded < 0) ||
      (allowNegative && !allowZero && rounded === 0)
    ) {
      throw new Error('Amount must be greater than zero.');
    }
    return rounded;
  }

  static positiveInteger(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${fieldName} must be a positive integer.`);
    }
    return parsed;
  }

  static normalizeIdempotencyKey(value, fieldName = 'Idempotency key') {
    if (typeof value !== 'string' || !/^[A-Za-z0-9:_-]{8,128}$/.test(value)) {
      throw new Error(`${fieldName} is invalid.`);
    }
    return value;
  }

  static async withFinancialTransaction(work) {
    const previous = this.transactionTail;
    let releaseQueue;
    this.transactionTail = new Promise((resolve) => {
      releaseQueue = resolve;
    });

    await previous.catch(() => undefined);
    let began = false;
    const tx = { run: this.run.bind(this), get: this.get.bind(this), all: this.all.bind(this) };

    try {
      await tx.run('BEGIN IMMEDIATE TRANSACTION');
      began = true;
      const result = await work(tx);
      await tx.run('COMMIT');
      return result;
    } catch (error) {
      if (began) {
        try {
          await tx.run('ROLLBACK');
        } catch (rollbackError) {
          console.error('Financial transaction rollback failed:', rollbackError.message);
        }
      }
      throw error;
    } finally {
      releaseQueue();
    }
  }

  static async ensureWalletTx(tx, userId) {
    const safeUserId = this.positiveInteger(userId, 'User ID');
    await tx.run(
      `INSERT OR IGNORE INTO wallets
       (user_id, available_balance, escrow_balance, pending_withdrawal, total_earned)
       VALUES (?, 0, 0, 0, 0)`,
      [safeUserId]
    );
    const wallet = await tx.get('SELECT * FROM wallets WHERE user_id = ?', [safeUserId]);
    if (!wallet) throw new Error('Wallet could not be created.');
    return wallet;
  }

  static async createOperationTx(tx, { operationKey, operationType, referenceType, referenceId, metadata = {} }) {
    const safeKey = this.normalizeIdempotencyKey(operationKey, 'Financial operation key');
    const existing = await tx.get(
      'SELECT * FROM financial_operations WHERE operation_key = ?',
      [safeKey]
    );
    if (existing) return { alreadyProcessed: true, operation: existing };

    const result = await tx.run(
      `INSERT INTO financial_operations
       (operation_key, operation_type, reference_type, reference_id, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        safeKey,
        String(operationType).slice(0, 64),
        String(referenceType || '').slice(0, 64) || null,
        referenceId ?? null,
        JSON.stringify(metadata),
      ]
    );
    return { alreadyProcessed: false, operation: { id: result.lastID, operation_key: safeKey } };
  }

  static async moveBalanceTx(tx, {
    userId,
    account,
    delta,
    type,
    referenceId = null,
    referenceType = 'order',
    description,
    idempotencyKey,
    earnedDelta = 0,
  }) {
    if (!WALLET_ACCOUNTS.has(account)) throw new Error('Invalid wallet account.');
    const safeUserId = this.positiveInteger(userId, 'User ID');
    const safeDelta = this.money(delta, { allowZero: true, allowNegative: true });
    if (safeDelta === 0) throw new Error('Wallet movement cannot be zero.');
    const safeKey = this.normalizeIdempotencyKey(idempotencyKey, 'Ledger entry key');

    const existing = await tx.get(
      'SELECT * FROM wallet_ledger_entries WHERE idempotency_key = ?',
      [safeKey]
    );
    if (existing) {
      return { alreadyProcessed: true, balance: Number(existing.balance_after), entry: existing };
    }

    const wallet = await this.ensureWalletTx(tx, safeUserId);
    const balanceBefore = this.money(wallet[account], { allowZero: true });
    const balanceAfter = this.money(balanceBefore + safeDelta, { allowZero: true });
    if (balanceAfter < 0) throw new Error('Insufficient wallet balance.');

    const update = await tx.run(
      `UPDATE wallets
       SET ${account} = ?,
           total_earned = ROUND(total_earned + ?, 2),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [balanceAfter, this.money(earnedDelta, { allowZero: true }), safeUserId]
    );
    if (update.changes !== 1) throw new Error('Wallet balance update failed.');

    const ledgerResult = await tx.run(
      `INSERT INTO wallet_ledger_entries
       (idempotency_key, user_id, account, amount, balance_before, balance_after,
        entry_type, reference_type, reference_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeKey,
        safeUserId,
        account,
        safeDelta,
        balanceBefore,
        balanceAfter,
        String(type).slice(0, 64),
        String(referenceType).slice(0, 64),
        referenceId,
        String(description || '').slice(0, 500),
      ]
    );

    // Keep the existing wallet history API compatible while the new immutable
    // ledger records every account, including escrow and pending withdrawals.
    if (account === 'available_balance') {
      await tx.run(
        `INSERT INTO wallet_transactions
         (user_id, type, amount, balance_before, balance_after, reference_id, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          safeUserId,
          String(type).slice(0, 64),
          safeDelta,
          balanceBefore,
          balanceAfter,
          referenceId,
          String(description || '').slice(0, 500),
        ]
      );
    }

    return {
      alreadyProcessed: false,
      balance: balanceAfter,
      entry: { id: ledgerResult.lastID, idempotency_key: safeKey },
    };
  }

  static async getWallet(userId) {
    return this.withFinancialTransaction(async (tx) => this.ensureWalletTx(tx, userId));
  }

  static async getTransactions(userId, limit = 50) {
    const safeUserId = this.positiveInteger(userId, 'User ID');
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.all(
      `SELECT id, user_id, type, amount, balance_before, balance_after, reference_id, description, created_at
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [safeUserId, safeLimit]
    );
  }

  static async addFunds(userId, amount, type, referenceId, description, operationKey = null) {
    const safeAmount = this.money(amount);
    const key = operationKey || `wallet-credit:${type}:${referenceId}:${userId}`;
    return this.withFinancialTransaction(async (tx) => {
      const operation = await this.createOperationTx(tx, {
        operationKey: key,
        operationType: type,
        referenceType: 'order',
        referenceId,
      });
      if (operation.alreadyProcessed) return { success: true, alreadyProcessed: true };

      const movement = await this.moveBalanceTx(tx, {
        userId,
        account: 'available_balance',
        delta: safeAmount,
        type,
        referenceId,
        description,
        idempotencyKey: `${key}:available`,
        earnedDelta: ['sale', 'cod_settlement', 'escrow_release'].includes(type) ? safeAmount : 0,
      });
      return { success: true, balance: movement.balance, alreadyProcessed: false };
    });
  }

  static async deductFunds(userId, amount, type, referenceId, description, operationKey = null) {
    const safeAmount = this.money(amount);
    const key = operationKey || `wallet-debit:${type}:${referenceId}:${userId}`;
    return this.withFinancialTransaction(async (tx) => {
      const operation = await this.createOperationTx(tx, {
        operationKey: key,
        operationType: type,
        referenceType: 'order',
        referenceId,
      });
      if (operation.alreadyProcessed) return { success: true, alreadyProcessed: true };

      const movement = await this.moveBalanceTx(tx, {
        userId,
        account: 'available_balance',
        delta: -safeAmount,
        type,
        referenceId,
        description,
        idempotencyKey: `${key}:available`,
      });
      return { success: true, balance: movement.balance, alreadyProcessed: false };
    });
  }

  static async createEscrowTx(tx, { orderId, buyerId, sellerId, grossAmount, commission }) {
    const safeOrderId = this.positiveInteger(orderId, 'Order ID');
    const safeBuyerId = this.positiveInteger(buyerId, 'Buyer ID');
    const safeSellerId = this.positiveInteger(sellerId, 'Seller ID');
    const amount = this.money(grossAmount);
    const safeCommission = this.money(commission, { allowZero: true });
    const sellerAmount = this.money(amount - safeCommission, { allowZero: true });

    const existing = await tx.get(
      'SELECT * FROM escrow_transactions WHERE order_id = ? AND seller_id = ? ORDER BY id ASC LIMIT 1',
      [safeOrderId, safeSellerId]
    );
    if (existing) return existing;

    const result = await tx.run(
      `INSERT INTO escrow_transactions
       (order_id, buyer_id, seller_id, amount, commission, seller_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [safeOrderId, safeBuyerId, safeSellerId, amount, safeCommission, sellerAmount]
    );
    return {
      id: result.lastID,
      order_id: safeOrderId,
      buyer_id: safeBuyerId,
      seller_id: safeSellerId,
      amount,
      commission: safeCommission,
      seller_amount: sellerAmount,
      status: 'pending',
    };
  }

  static async fundOrderEscrowsTx(tx, orderId) {
    const safeOrderId = this.positiveInteger(orderId, 'Order ID');
    const escrows = await tx.all(
      `SELECT * FROM escrow_transactions
       WHERE order_id = ? AND status = 'pending'
       ORDER BY id ASC`,
      [safeOrderId]
    );

    for (const escrow of escrows) {
      const operationKey = `escrow-hold:${escrow.id}`;
      const operation = await this.createOperationTx(tx, {
        operationKey,
        operationType: 'escrow_hold',
        referenceType: 'escrow',
        referenceId: escrow.id,
      });
      if (operation.alreadyProcessed) continue;

      const statusUpdate = await tx.run(
        `UPDATE escrow_transactions
         SET status = 'held', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`,
        [escrow.id]
      );
      if (statusUpdate.changes !== 1) throw new Error('Escrow state changed before it could be funded.');

      await this.moveBalanceTx(tx, {
        userId: escrow.seller_id,
        account: 'escrow_balance',
        delta: this.money(escrow.seller_amount),
        type: 'escrow_hold',
        referenceId: escrow.id,
        referenceType: 'escrow',
        description: `Funds held for order #${escrow.order_id}`,
        idempotencyKey: `${operationKey}:seller-escrow`,
      });
    }
    return escrows.length;
  }

  static async fundOrderEscrows(orderId) {
    return this.withFinancialTransaction((tx) => this.fundOrderEscrowsTx(tx, orderId));
  }

  static async releaseEscrowTx(tx, escrowId) {
    const safeEscrowId = this.positiveInteger(escrowId, 'Escrow ID');
    const escrow = await tx.get('SELECT * FROM escrow_transactions WHERE id = ?', [safeEscrowId]);
    if (!escrow) throw new Error('Escrow not found.');
    if (escrow.status === 'released') return { success: true, alreadyProcessed: true };
    if (escrow.status !== 'held') throw new Error('Escrow is not eligible for release.');

    const operationKey = `escrow-release:${escrow.id}`;
    const operation = await this.createOperationTx(tx, {
      operationKey,
      operationType: 'escrow_release',
      referenceType: 'escrow',
      referenceId: escrow.id,
    });
    if (operation.alreadyProcessed) return { success: true, alreadyProcessed: true };

    const statusUpdate = await tx.run(
      `UPDATE escrow_transactions
       SET status = 'released', release_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'held'`,
      [escrow.id]
    );
    if (statusUpdate.changes !== 1) throw new Error('Escrow was already processed.');

    const sellerAmount = this.money(escrow.seller_amount);
    await this.moveBalanceTx(tx, {
      userId: escrow.seller_id,
      account: 'escrow_balance',
      delta: -sellerAmount,
      type: 'escrow_release',
      referenceId: escrow.id,
      referenceType: 'escrow',
      description: `Escrow released for order #${escrow.order_id}`,
      idempotencyKey: `${operationKey}:escrow`,
    });
    await this.moveBalanceTx(tx, {
      userId: escrow.seller_id,
      account: 'available_balance',
      delta: sellerAmount,
      type: 'escrow_release',
      referenceId: escrow.order_id,
      referenceType: 'order',
      description: `Payment released for order #${escrow.order_id}`,
      idempotencyKey: `${operationKey}:available`,
      earnedDelta: sellerAmount,
    });
    await tx.run(
      `UPDATE payment_splits
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE order_id = ? AND party_type = 'seller' AND party_id = ? AND status = 'pending'`,
      [escrow.order_id, escrow.seller_id]
    );
    return { success: true, alreadyProcessed: false };
  }

  static async releaseEscrow(escrowId) {
    return this.withFinancialTransaction((tx) => this.releaseEscrowTx(tx, escrowId));
  }

  static async releaseOrderEscrowsAfterDelivery(orderId, actorId) {
    const safeOrderId = this.positiveInteger(orderId, 'Order ID');
    return this.withFinancialTransaction(async (tx) => {
      const order = await tx.get('SELECT * FROM orders WHERE id = ?', [safeOrderId]);
      if (!order) throw new Error('Order not found.');
      if (order.status === 'delivered') return { alreadyProcessed: true, order };

      const orderUpdate = await tx.run(
        `UPDATE orders SET status = 'delivered' WHERE id = ? AND status = 'shipped'`,
        [safeOrderId]
      );
      if (orderUpdate.changes !== 1) throw new Error('Order must be shipped before delivery is confirmed.');

      const escrows = await tx.all(
        `SELECT id FROM escrow_transactions WHERE order_id = ? AND status = 'held' ORDER BY id ASC`,
        [safeOrderId]
      );
      for (const escrow of escrows) {
        await this.releaseEscrowTx(tx, escrow.id);
      }
      if (escrows.length > 0) {
        await tx.run(
          `UPDATE payment_splits
           SET status = 'completed', completed_at = CURRENT_TIMESTAMP
           WHERE order_id = ? AND party_type IN ('platform', 'delivery') AND status = 'pending'`,
          [safeOrderId]
        );
      }
      await tx.run(
        `INSERT INTO order_status_history (order_id, status, note, created_by)
         VALUES (?, 'delivered', 'Order delivered and eligible escrow released', ?)`,
        [safeOrderId, actorId]
      );
      return { alreadyProcessed: false, releasedEscrows: escrows.length };
    });
  }

  static async requestWithdrawal(userId, amount, method, bankDetails, requestKey) {
    const safeUserId = this.positiveInteger(userId, 'User ID');
    const safeAmount = this.money(amount);
    const safeKey = this.normalizeIdempotencyKey(requestKey, 'Withdrawal request key');
    const allowedMethods = new Set(['bank_transfer']);
    if (!allowedMethods.has(method)) throw new Error('Unsupported withdrawal method.');
    if (!bankDetails || typeof bankDetails !== 'object' || Array.isArray(bankDetails)) {
      throw new Error('Bank details are required.');
    }
    const bankDetailsJson = JSON.stringify(bankDetails);
    if (bankDetailsJson.length > 4000) throw new Error('Bank details are too large.');

    return this.withFinancialTransaction(async (tx) => {
      const existing = await tx.get(
        'SELECT * FROM withdrawal_requests WHERE request_key = ?',
        [safeKey]
      );
      if (existing) return { success: true, alreadyProcessed: true, requestId: existing.id };

      const operationKey = `withdrawal-request:${safeKey}`;
      const operation = await this.createOperationTx(tx, {
        operationKey,
        operationType: 'withdrawal_request',
        referenceType: 'withdrawal',
        referenceId: null,
        metadata: { userId: safeUserId, amount: safeAmount },
      });
      if (operation.alreadyProcessed) throw new Error('Withdrawal request state is inconsistent.');

      await this.moveBalanceTx(tx, {
        userId: safeUserId,
        account: 'available_balance',
        delta: -safeAmount,
        type: 'withdrawal_request',
        referenceId: null,
        referenceType: 'withdrawal',
        description: 'Withdrawal funds reserved for review',
        idempotencyKey: `${operationKey}:available`,
      });
      await this.moveBalanceTx(tx, {
        userId: safeUserId,
        account: 'pending_withdrawal',
        delta: safeAmount,
        type: 'withdrawal_request',
        referenceId: null,
        referenceType: 'withdrawal',
        description: 'Withdrawal funds pending payout',
        idempotencyKey: `${operationKey}:pending`,
      });

      const request = await tx.run(
        `INSERT INTO withdrawal_requests
         (user_id, amount, method, bank_details, status, request_key)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
        [safeUserId, safeAmount, method, bankDetailsJson, safeKey]
      );
      await tx.run(
        `UPDATE wallet_ledger_entries SET reference_id = ?
         WHERE idempotency_key IN (?, ?)`,
        [request.lastID, `${operationKey}:available`, `${operationKey}:pending`]
      );
      return { success: true, alreadyProcessed: false, requestId: request.lastID };
    });
  }

  static async processWithdrawal({ withdrawalId, action, adminId, notes = '', providerReference = '' }) {
    const safeWithdrawalId = this.positiveInteger(withdrawalId, 'Withdrawal ID');
    const safeAdminId = this.positiveInteger(adminId, 'Admin ID');
    if (!['approve', 'reject'].includes(action)) throw new Error('Invalid withdrawal action.');
    if (String(notes).length > 1000 || String(providerReference).length > 256) {
      throw new Error('Withdrawal processing details are too large.');
    }
    if (action === 'approve' && !String(providerReference).trim()) {
      throw new Error('A payout reference is required before approving a withdrawal.');
    }

    return this.withFinancialTransaction(async (tx) => {
      const withdrawal = await tx.get('SELECT * FROM withdrawal_requests WHERE id = ?', [safeWithdrawalId]);
      if (!withdrawal) throw new Error('Withdrawal not found.');
      if (withdrawal.status !== 'pending') {
        return { success: true, alreadyProcessed: true, status: withdrawal.status };
      }

      const operationKey = `withdrawal-${action}:${withdrawal.id}`;
      const operation = await this.createOperationTx(tx, {
        operationKey,
        operationType: `withdrawal_${action}`,
        referenceType: 'withdrawal',
        referenceId: withdrawal.id,
      });
      if (operation.alreadyProcessed) return { success: true, alreadyProcessed: true };

      const nextStatus = action === 'approve' ? 'completed' : 'rejected';
      const statusUpdate = await tx.run(
        `UPDATE withdrawal_requests
         SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP,
             notes = ?, provider_reference = ?
         WHERE id = ? AND status = 'pending'`,
        [nextStatus, safeAdminId, String(notes), String(providerReference).trim() || null, withdrawal.id]
      );
      if (statusUpdate.changes !== 1) throw new Error('Withdrawal was already processed.');

      const amount = this.money(withdrawal.amount);
      await this.moveBalanceTx(tx, {
        userId: withdrawal.user_id,
        account: 'pending_withdrawal',
        delta: -amount,
        type: action === 'approve' ? 'withdrawal_paid' : 'withdrawal_rejected',
        referenceId: withdrawal.id,
        referenceType: 'withdrawal',
        description: action === 'approve' ? 'Withdrawal payout completed' : 'Withdrawal funds returned',
        idempotencyKey: `${operationKey}:pending`,
      });
      if (action === 'reject') {
        await this.moveBalanceTx(tx, {
          userId: withdrawal.user_id,
          account: 'available_balance',
          delta: amount,
          type: 'withdrawal_rejected',
          referenceId: withdrawal.id,
          referenceType: 'withdrawal',
          description: 'Withdrawal funds returned',
          idempotencyKey: `${operationKey}:available`,
        });
      }
      return { success: true, alreadyProcessed: false, status: nextStatus };
    });
  }

  static sanitizeShippingAddress(shippingAddress) {
    if (!shippingAddress || typeof shippingAddress !== 'object' || Array.isArray(shippingAddress)) {
      throw new Error('A shipping address is required.');
    }
    const limits = {
      fullName: 120,
      email: 254,
      phone: 40,
      address: 500,
      city: 120,
      postalCode: 32,
    };
    const safeAddress = {};
    for (const [field, limit] of Object.entries(limits)) {
      const value = String(shippingAddress[field] || '').trim();
      if (['fullName', 'email', 'phone', 'address', 'city'].includes(field) && !value) {
        throw new Error(`Shipping ${field} is required.`);
      }
      if (value.length > limit) throw new Error(`Shipping ${field} is too long.`);
      safeAddress[field] = value;
    }
    if (!/^\S+@\S+\.\S+$/.test(safeAddress.email)) throw new Error('Shipping email is invalid.');
    return safeAddress;
  }

  static async createMarketplaceOrder({
    buyerId,
    orderNumber,
    paymentMethod,
    shippingAddress,
    notes = '',
    items,
    expectedTotal,
    idempotencyKey,
  }) {
    const safeBuyerId = this.positiveInteger(buyerId, 'Buyer ID');
    const safeRequestKey = this.normalizeIdempotencyKey(idempotencyKey, 'Checkout idempotency key');
    const allowedPaymentMethods = new Set(['cash', 'cmi', 'wallet']);
    if (!allowedPaymentMethods.has(paymentMethod)) throw new Error('Unsupported payment method.');
    if (!Array.isArray(items) || items.length === 0 || items.length > 25) {
      throw new Error('Checkout must contain between 1 and 25 items.');
    }
    const safeAddress = this.sanitizeShippingAddress(shippingAddress);
    if (String(notes).length > 1000) throw new Error('Order notes are too long.');

    const requestedQuantities = new Map();
    for (const item of items) {
      const productId = this.positiveInteger(item?.id, 'Product ID');
      const quantity = this.positiveInteger(item?.quantity, 'Item quantity');
      if (quantity > 100) throw new Error('Item quantity cannot exceed 100.');
      requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
    }

    return this.withFinancialTransaction(async (tx) => {
      const existingRequest = await tx.get(
        `SELECT o.*
         FROM checkout_requests cr
         JOIN orders o ON o.id = cr.order_id
         WHERE cr.user_id = ? AND cr.idempotency_key = ?`,
        [safeBuyerId, safeRequestKey]
      );
      if (existingRequest) {
        return { order: existingRequest, alreadyCreated: true };
      }

      const orderItems = [];
      const sellerGroups = new Map();
      let subtotal = 0;
      for (const [productId, quantity] of requestedQuantities) {
        const product = await tx.get(
          `SELECT id, seller_id, title, image, price, stock, status
           FROM products
           WHERE id = ?`,
          [productId]
        );
        if (!product || product.status !== 'published') throw new Error('A product in your cart is no longer available.');
        if (!product.seller_id || product.seller_id === safeBuyerId) throw new Error('You cannot order your own product.');
        if (!Number.isInteger(product.stock) || product.stock < quantity) {
          throw new Error(`Insufficient stock for "${product.title}".`);
        }

        const price = this.money(product.price);
        const lineTotal = this.money(price * quantity);
        subtotal = this.money(subtotal + lineTotal, { allowZero: true });
        const orderItem = {
          productId: product.id,
          sellerId: product.seller_id,
          title: product.title,
          image: product.image || '',
          price,
          quantity,
          lineTotal,
        };
        orderItems.push(orderItem);
        const group = sellerGroups.get(product.seller_id) || { grossAmount: 0, items: [] };
        group.grossAmount = this.money(group.grossAmount + lineTotal, { allowZero: true });
        group.items.push(orderItem);
        sellerGroups.set(product.seller_id, group);
      }

      const deliveryFee = subtotal > 500 ? 0 : 50;
      const total = this.money(subtotal + deliveryFee);
      if (expectedTotal !== undefined && expectedTotal !== null && expectedTotal !== '') {
        const clientTotal = this.money(expectedTotal);
        if (clientTotal !== total) {
          throw new Error('Checkout total has changed. Please refresh your cart and try again.');
        }
      }

      const paymentStatus = paymentMethod === 'wallet' ? 'paid' : 'pending';
      const initialStatus = paymentMethod === 'wallet' ? 'processing' : 'pending';
      const orderInsert = await tx.run(
        `INSERT INTO orders
         (order_number, user_id, total, payment_method, payment_status, shipping_address, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(orderNumber).slice(0, 100),
          safeBuyerId,
          total,
          paymentMethod,
          paymentStatus,
          JSON.stringify(safeAddress),
          String(notes),
          initialStatus,
        ]
      );
      const orderId = orderInsert.lastID;

      for (const item of orderItems) {
        const stockUpdate = await tx.run(
          `UPDATE products
           SET stock = stock - ?, sold = COALESCE(sold, 0) + ?
           WHERE id = ? AND stock >= ?`,
          [item.quantity, item.quantity, item.productId, item.quantity]
        );
        if (stockUpdate.changes !== 1) throw new Error(`Stock changed for "${item.title}". Please try again.`);
        await tx.run(
          `INSERT INTO order_items
           (order_id, product_id, quantity, price, product_title, product_image)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.quantity, item.price, item.title, item.image]
        );
      }

      let sellerNetTotal = 0;
      for (const [sellerId, group] of sellerGroups) {
        const grossAmount = this.money(group.grossAmount);
        const commission = this.money(grossAmount * PLATFORM_COMMISSION_RATE, { allowZero: true });
        const sellerAmount = this.money(grossAmount - commission, { allowZero: true });
        sellerNetTotal = this.money(sellerNetTotal + sellerAmount, { allowZero: true });
        await tx.run(
          `INSERT INTO payment_splits (order_id, party_type, party_id, amount, status)
           VALUES (?, 'seller', ?, ?, 'pending')`,
          [orderId, sellerId, sellerAmount]
        );
        if (paymentMethod !== 'cash') {
          await this.createEscrowTx(tx, {
            orderId,
            buyerId: safeBuyerId,
            sellerId,
            grossAmount,
            commission,
          });
        }
      }
      const platformAmount = this.money(subtotal - sellerNetTotal, { allowZero: true });
      await tx.run(
        `INSERT INTO payment_splits (order_id, party_type, amount, status)
         VALUES (?, 'platform', ?, 'pending')`,
        [orderId, platformAmount]
      );
      if (deliveryFee > 0) {
        await tx.run(
          `INSERT INTO payment_splits (order_id, party_type, amount, status)
           VALUES (?, 'delivery', ?, 'pending')`,
          [orderId, deliveryFee]
        );
      }

      if (paymentMethod === 'wallet') {
        const operationKey = `wallet-order:${orderId}`;
        const operation = await this.createOperationTx(tx, {
          operationKey,
          operationType: 'wallet_purchase',
          referenceType: 'order',
          referenceId: orderId,
        });
        if (operation.alreadyProcessed) throw new Error('Wallet order operation is inconsistent.');
        await this.moveBalanceTx(tx, {
          userId: safeBuyerId,
          account: 'available_balance',
          delta: -total,
          type: 'purchase',
          referenceId: orderId,
          referenceType: 'order',
          description: `Wallet payment for order #${orderNumber}`,
          idempotencyKey: `${operationKey}:buyer-available`,
        });
        await this.fundOrderEscrowsTx(tx, orderId);
      }

      await tx.run(
        `INSERT INTO checkout_requests (user_id, idempotency_key, order_id)
         VALUES (?, ?, ?)`,
        [safeBuyerId, safeRequestKey, orderId]
      );
      await tx.run('DELETE FROM cart WHERE user_id = ?', [safeBuyerId]);

      return {
        order: {
          id: orderId,
          order_number: orderNumber,
          total,
          status: initialStatus,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          shipping_address: JSON.stringify(safeAddress),
        },
        alreadyCreated: false,
      };
    });
  }

  static async cancelUnpaidOrder(orderId, buyerId) {
    const safeOrderId = this.positiveInteger(orderId, 'Order ID');
    const safeBuyerId = this.positiveInteger(buyerId, 'Buyer ID');
    return this.withFinancialTransaction(async (tx) => {
      const order = await tx.get(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
        [safeOrderId, safeBuyerId]
      );
      if (!order) throw new Error('Order not found.');
      if (order.status !== 'pending') throw new Error('Only pending orders can be cancelled.');
      if (order.payment_status === 'paid') {
        throw new Error('Paid orders must use the refund workflow.');
      }
      const activeCmiAttempt = await tx.get(
        `SELECT id FROM payment_transactions
         WHERE order_id = ? AND status = 'pending'`,
        [safeOrderId]
      );
      if (activeCmiAttempt) {
        throw new Error('A CMI payment attempt is still pending. Wait for its result before cancelling.');
      }

      const update = await tx.run(
        `UPDATE orders SET status = 'cancelled', payment_status = 'cancelled'
         WHERE id = ? AND user_id = ? AND status = 'pending' AND payment_status != 'paid'`,
        [safeOrderId, safeBuyerId]
      );
      if (update.changes !== 1) throw new Error('Order was already updated.');
      const items = await tx.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [safeOrderId]);
      for (const item of items) {
        await tx.run(
          `UPDATE products
           SET stock = stock + ?, sold = MAX(COALESCE(sold, 0) - ?, 0)
           WHERE id = ?`,
          [item.quantity, item.quantity, item.product_id]
        );
      }
      await tx.run(`UPDATE escrow_transactions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                    WHERE order_id = ? AND status = 'pending'`, [safeOrderId]);
      await tx.run(`UPDATE payment_splits SET status = 'cancelled'
                    WHERE order_id = ? AND status = 'pending'`, [safeOrderId]);
      await tx.run(
        `INSERT INTO order_status_history (order_id, status, note, created_by)
         VALUES (?, 'cancelled', 'Order cancelled by buyer before payment', ?)`,
        [safeOrderId, safeBuyerId]
      );
      return { success: true };
    });
  }

  static async requestRefund({ orderId, requesterId, reason = '' }) {
    const safeOrderId = this.positiveInteger(orderId, 'Order ID');
    const safeRequesterId = this.positiveInteger(requesterId, 'Requester ID');
    if (String(reason).trim().length < 3 || String(reason).length > 1000) {
      throw new Error('A refund reason between 3 and 1000 characters is required.');
    }
    return this.withFinancialTransaction(async (tx) => {
      const order = await tx.get(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
        [safeOrderId, safeRequesterId]
      );
      if (!order) throw new Error('Order not found.');
      if (order.payment_status !== 'paid') throw new Error('Only paid orders can have a refund request.');
      const existing = await tx.get('SELECT * FROM refund_requests WHERE order_id = ?', [safeOrderId]);
      if (existing) return { requestId: existing.id, alreadyProcessed: true, status: existing.status };
      const result = await tx.run(
        `INSERT INTO refund_requests (order_id, requested_by, amount, payment_method, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [safeOrderId, safeRequesterId, this.money(order.total), order.payment_method, String(reason).trim()]
      );
      return { requestId: result.lastID, alreadyProcessed: false, status: 'pending' };
    });
  }

  static async completeRefund({ refundId, adminId, providerReference = '', notes = '' }) {
    const safeRefundId = this.positiveInteger(refundId, 'Refund ID');
    const safeAdminId = this.positiveInteger(adminId, 'Admin ID');
    if (String(providerReference).length > 256 || String(notes).length > 1000) {
      throw new Error('Refund processing details are too large.');
    }
    return this.withFinancialTransaction(async (tx) => {
      const refund = await tx.get('SELECT * FROM refund_requests WHERE id = ?', [safeRefundId]);
      if (!refund) throw new Error('Refund request not found.');
      if (refund.status !== 'pending') {
        return { success: true, alreadyProcessed: true, status: refund.status };
      }
      if (refund.payment_method === 'cmi' && !String(providerReference).trim()) {
        throw new Error('A CMI refund reference is required after the refund is completed in CMI.');
      }
      if (!['wallet', 'cmi'].includes(refund.payment_method)) {
        throw new Error('This payment method requires a manual refund outside the platform.');
      }

      const releasedEscrow = await tx.get(
        `SELECT id FROM escrow_transactions WHERE order_id = ? AND status = 'released' LIMIT 1`,
        [refund.order_id]
      );
      if (releasedEscrow) {
        throw new Error('Seller funds were already released. Resolve the recovery manually before completing this refund.');
      }
      const order = await tx.get('SELECT * FROM orders WHERE id = ?', [refund.order_id]);
      if (!order || order.payment_status !== 'paid') throw new Error('Order is not eligible for refund completion.');

      const operationKey = `refund-complete:${refund.id}`;
      const operation = await this.createOperationTx(tx, {
        operationKey,
        operationType: 'refund_complete',
        referenceType: 'refund',
        referenceId: refund.id,
        metadata: { adminId: safeAdminId, paymentMethod: refund.payment_method },
      });
      if (operation.alreadyProcessed) return { success: true, alreadyProcessed: true, status: 'completed' };

      const heldEscrows = await tx.all(
        `SELECT * FROM escrow_transactions WHERE order_id = ? AND status = 'held' ORDER BY id ASC`,
        [refund.order_id]
      );
      for (const escrow of heldEscrows) {
        const escrowAmount = this.money(escrow.seller_amount);
        await this.moveBalanceTx(tx, {
          userId: escrow.seller_id,
          account: 'escrow_balance',
          delta: -escrowAmount,
          type: 'escrow_refund',
          referenceId: refund.id,
          referenceType: 'refund',
          description: `Escrow reversed for refunded order #${refund.order_id}`,
          idempotencyKey: `${operationKey}:escrow:${escrow.id}`,
        });
        await tx.run(
          `UPDATE escrow_transactions SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'held'`,
          [escrow.id]
        );
      }
      await tx.run(
        `UPDATE escrow_transactions SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ? AND status = 'pending'`,
        [refund.order_id]
      );

      if (refund.payment_method === 'wallet') {
        await this.moveBalanceTx(tx, {
          userId: order.user_id,
          account: 'available_balance',
          delta: this.money(refund.amount),
          type: 'refund',
          referenceId: refund.id,
          referenceType: 'refund',
          description: `Refund for order #${order.order_number}`,
          idempotencyKey: `${operationKey}:buyer-available`,
        });
      }

      const refundUpdate = await tx.run(
        `UPDATE refund_requests
         SET status = 'completed', provider_reference = ?, processed_by = ?,
             processed_at = CURRENT_TIMESTAMP, notes = ?
         WHERE id = ? AND status = 'pending'`,
        [String(providerReference).trim() || null, safeAdminId, String(notes), refund.id]
      );
      if (refundUpdate.changes !== 1) throw new Error('Refund was already processed.');
      await tx.run(
        `UPDATE orders SET payment_status = 'refunded', status = 'cancelled'
         WHERE id = ? AND payment_status = 'paid'`,
        [refund.order_id]
      );
      await tx.run(
        `UPDATE payment_transactions SET status = 'refunded'
         WHERE order_id = ? AND status = 'completed'`,
        [refund.order_id]
      );
      await tx.run(
        `UPDATE payment_splits SET status = 'refunded'
         WHERE order_id = ? AND status = 'pending'`,
        [refund.order_id]
      );
      await tx.run(
        `INSERT INTO order_status_history (order_id, status, note, created_by)
         VALUES (?, 'cancelled', 'Refund completed', ?)`,
        [refund.order_id, safeAdminId]
      );
      return { success: true, alreadyProcessed: false, status: 'completed' };
    });
  }

  static async settleCodOrder(orderId, adminId) {
    const safeOrderId = this.positiveInteger(orderId, 'Order ID');
    return this.withFinancialTransaction(async (tx) => {
      const order = await tx.get(
        `SELECT * FROM orders
         WHERE id = ? AND payment_method = 'cash' AND status = 'delivered'`,
        [safeOrderId]
      );
      if (!order) throw new Error('Order not found or not eligible for COD settlement.');

      const sellerSplits = await tx.all(
        `SELECT * FROM payment_splits
         WHERE order_id = ? AND party_type = 'seller' AND status = 'pending'
         ORDER BY id ASC`,
        [safeOrderId]
      );
      if (sellerSplits.length === 0) return { success: true, alreadyProcessed: true };

      const operationKey = `cod-settlement:${safeOrderId}`;
      const operation = await this.createOperationTx(tx, {
        operationKey,
        operationType: 'cod_settlement',
        referenceType: 'order',
        referenceId: safeOrderId,
        metadata: { adminId },
      });
      if (operation.alreadyProcessed) return { success: true, alreadyProcessed: true };

      for (const split of sellerSplits) {
        const splitUpdate = await tx.run(
          `UPDATE payment_splits
           SET status = 'completed', completed_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'pending'`,
          [split.id]
        );
        if (splitUpdate.changes !== 1) throw new Error('COD seller settlement was already processed.');
        await this.moveBalanceTx(tx, {
          userId: split.party_id,
          account: 'available_balance',
          delta: this.money(split.amount),
          type: 'cod_settlement',
          referenceId: safeOrderId,
          referenceType: 'order',
          description: `COD settlement for order #${order.order_number}`,
          idempotencyKey: `${operationKey}:seller:${split.party_id}`,
          earnedDelta: this.money(split.amount),
        });
      }
      await tx.run(
        `UPDATE payment_splits
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE order_id = ? AND party_type IN ('platform', 'delivery') AND status = 'pending'`,
        [safeOrderId]
      );
      return { success: true, alreadyProcessed: false };
    });
  }
}

module.exports = WalletService;
