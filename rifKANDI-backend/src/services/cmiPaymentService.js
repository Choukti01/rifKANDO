const crypto = require('crypto');
const cmi = require('cmi-payment-nodejs');
const config = require('../config/cmi');
const WalletService = require('./walletService');

const PAYMENT_FIELDS_TO_STORE = [
  'oid', 'clientid', 'amount', 'currency', 'ProcReturnCode', 'Response',
  'AuthCode', 'TransId', 'HostRefNum', 'mdStatus',
];

class CmiPaymentService {
  static generateOrderId(orderNumber) {
    return `RIF-${orderNumber}-${crypto.randomUUID()}`;
  }

  static sanitizePaymentData(params = {}) {
    return PAYMENT_FIELDS_TO_STORE.reduce((safeParams, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        safeParams[key] = String(params[key]).slice(0, 256);
      }
      return safeParams;
    }, {});
  }

  static amountsMatch(expectedAmount, receivedAmount) {
    const toMinorUnits = (value) => {
      const normalized = String(value ?? '').replace(',', '.').trim();
      if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
      return Math.round(Number(normalized) * 100);
    };

    const expected = toMinorUnits(expectedAmount);
    const received = toMinorUnits(receivedAmount);
    return expected !== null && received !== null && expected === received;
  }

  /**
   * CMI returns HASHPARAMS, HASHPARAMSVAL and HASH. The returned value list and
   * store-key hash must both match. No browser return is trusted as payment proof.
   */
  static verifyPayment(params = {}) {
    try {
      const hashParams = params.HASHPARAMS;
      const hashParamsValue = params.HASHPARAMSVAL;
      const returnedHash = params.HASH;
      if (
        typeof hashParams !== 'string' ||
        typeof hashParamsValue !== 'string' ||
        typeof returnedHash !== 'string' ||
        !config.storekey
      ) {
        return false;
      }

      const fields = hashParams.split(':').filter(Boolean);
      if (fields.length === 0) return false;
      const concatenatedValues = fields.map((field) => String(params[field] ?? '')).join('');
      const calculatedHash = crypto
        .createHash('sha512')
        .update(`${concatenatedValues}${config.storekey}`, 'utf8')
        .digest('base64');

      const receivedValue = Buffer.from(hashParamsValue, 'utf8');
      const calculatedValue = Buffer.from(concatenatedValues, 'utf8');
      const receivedHash = Buffer.from(returnedHash, 'utf8');
      const calculatedHashBuffer = Buffer.from(calculatedHash, 'utf8');
      return (
        receivedValue.length === calculatedValue.length &&
        receivedHash.length === calculatedHashBuffer.length &&
        crypto.timingSafeEqual(receivedValue, calculatedValue) &&
        crypto.timingSafeEqual(receivedHash, calculatedHashBuffer)
      );
    } catch (error) {
      console.error('CMI callback signature verification failed:', error.message);
      return false;
    }
  }

  static async initiatePayment(order, user) {
    if (!config.storekey || !config.clientid || !process.env.BACKEND_URL || !process.env.CLIENT_URL) {
      throw new Error('CMI payment is not configured.');
    }

    const oid = this.generateOrderId(order.order_number || order.id);
    await WalletService.withFinancialTransaction(async (tx) => {
      const currentOrder = await tx.get('SELECT * FROM orders WHERE id = ?', [order.id]);
      if (!currentOrder) throw new Error('Order not found.');
      if (currentOrder.payment_status === 'paid') throw new Error('This order has already been paid.');
      if (currentOrder.payment_status !== 'pending' || currentOrder.payment_method !== 'cmi') {
        throw new Error('Order is not eligible for CMI payment.');
      }
      const pendingTransaction = await tx.get(
        `SELECT id FROM payment_transactions
         WHERE order_id = ? AND status = 'pending'`,
        [currentOrder.id]
      );
      if (pendingTransaction) {
        throw new Error('A CMI payment attempt is already pending for this order.');
      }
      await tx.run(
        `INSERT INTO payment_transactions (order_id, cmi_oid, amount, status)
         VALUES (?, ?, ?, 'pending')`,
        [currentOrder.id, oid, currentOrder.total]
      );
    });

    try {
      const CmiClient = new cmi.default({
        storekey: config.storekey,
        clientid: config.clientid,
        oid,
        shopurl: config.shopurl,
        okUrl: config.okUrl,
        failUrl: config.failUrl,
        callbackURL: config.callbackURL,
        amount: String(order.total),
        email: user.email,
        BillToName: user.name,
        tel: user.phone || '',
        currency: config.currency,
        lang: config.lang,
      });
      return { htmlForm: CmiClient.redirect_post(), oid };
    } catch (error) {
      await WalletService.withFinancialTransaction((tx) => tx.run(
        `UPDATE payment_transactions
         SET status = 'failed', error_message = ?
         WHERE cmi_oid = ? AND status = 'pending'`,
        ['Unable to initialize payment.', oid]
      ));
      throw error;
    }
  }

  static async processSuccessPayment(oid, paymentData) {
    if (!oid || !this.verifyPayment(paymentData)) {
      throw new Error('Invalid CMI payment callback.');
    }
    if (String(paymentData.ProcReturnCode) !== '00') {
      throw new Error('CMI callback does not confirm an approved payment.');
    }
    if (paymentData.currency !== undefined && String(paymentData.currency) !== String(config.currency)) {
      throw new Error('CMI callback currency does not match.');
    }

    return WalletService.withFinancialTransaction(async (tx) => {
      const transaction = await tx.get(
        'SELECT * FROM payment_transactions WHERE cmi_oid = ?',
        [oid]
      );
      if (!transaction) throw new Error('Payment transaction not found.');
      if (!this.amountsMatch(transaction.amount, paymentData.amount)) {
        throw new Error('CMI callback amount does not match the order.');
      }
      if (String(paymentData.clientid) !== String(config.clientid)) {
        throw new Error('CMI callback client identifier does not match.');
      }
      if (transaction.status === 'completed') {
        return { success: true, alreadyProcessed: true, orderId: transaction.order_id };
      }
      if (transaction.status !== 'pending') {
        throw new Error('Payment transaction is not pending.');
      }

      const order = await tx.get('SELECT * FROM orders WHERE id = ?', [transaction.order_id]);
      if (!order || order.payment_status !== 'pending') {
        throw new Error('Order payment state is not pending.');
      }
      const paymentDataJson = JSON.stringify(this.sanitizePaymentData(paymentData));
      const transactionUpdate = await tx.run(
        `UPDATE payment_transactions
         SET status = 'completed', payment_data = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`,
        [paymentDataJson, transaction.id]
      );
      if (transactionUpdate.changes !== 1) throw new Error('Payment transaction was already processed.');

      const orderUpdate = await tx.run(
        `UPDATE orders
         SET payment_status = 'paid', status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
             payment_method = 'cmi', payment_details = ?
         WHERE id = ? AND payment_status = 'pending'`,
        [paymentDataJson, transaction.order_id]
      );
      if (orderUpdate.changes !== 1) throw new Error('Order payment state could not be updated.');

      await WalletService.fundOrderEscrowsTx(tx, transaction.order_id);
      await tx.run('DELETE FROM cart WHERE user_id = ?', [order.user_id]);
      return { success: true, alreadyProcessed: false, orderId: transaction.order_id };
    });
  }

  static async processFailedPayment(oid, paymentData) {
    if (!oid || !this.verifyPayment(paymentData)) {
      throw new Error('Invalid CMI payment callback.');
    }

    return WalletService.withFinancialTransaction(async (tx) => {
      const transaction = await tx.get('SELECT * FROM payment_transactions WHERE cmi_oid = ?', [oid]);
      if (!transaction || transaction.status !== 'pending') return false;

      const safePaymentData = JSON.stringify(this.sanitizePaymentData(paymentData));
      const transactionUpdate = await tx.run(
        `UPDATE payment_transactions
         SET status = 'failed', payment_data = ?, error_message = ?
         WHERE id = ? AND status = 'pending'`,
        [safePaymentData, 'Payment was declined by CMI.', transaction.id]
      );
      if (transactionUpdate.changes !== 1) return false;

      const order = await tx.get('SELECT * FROM orders WHERE id = ?', [transaction.order_id]);
      const orderUpdate = await tx.run(
        `UPDATE orders SET payment_status = 'failed', status = 'cancelled', payment_method = 'cmi'
         WHERE id = ? AND payment_status = 'pending'`,
        [transaction.order_id]
      );
      if (orderUpdate.changes === 1) {
        const items = await tx.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [transaction.order_id]);
        for (const item of items) {
          await tx.run(
            `UPDATE products
             SET stock = stock + ?, sold = MAX(COALESCE(sold, 0) - ?, 0)
             WHERE id = ?`,
            [item.quantity, item.quantity, item.product_id]
          );
        }
        await tx.run(
          `INSERT INTO order_status_history (order_id, status, note, created_by)
           VALUES (?, 'cancelled', 'CMI payment was declined', NULL)`,
          [transaction.order_id]
        );
      }
      return Boolean(order);
    });
  }
}

module.exports = CmiPaymentService;
