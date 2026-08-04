const crypto = require('crypto');
const cmi = require('cmi-payment-nodejs');
const config = require('../config/cmi');
const db = require('../config/database');

const PAYMENT_FIELDS_TO_STORE = [
  'oid', 'clientid', 'amount', 'currency', 'ProcReturnCode', 'Response',
  'AuthCode', 'TransId', 'HostRefNum', 'mdStatus'
];

class CmiPaymentService {
  static generateOrderId(orderNumber) {
    return `RIF-${orderNumber}-${crypto.randomUUID()}`;
  }

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
   * Validate the CMI 3-D Secure return hash. CMI sends HASHPARAMS,
   * HASHPARAMSVAL and HASH; each listed field is concatenated in order and
   * signed with the store key. Never accept a payment without all three.
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
    if (order.payment_status === 'paid') {
      throw new Error('This order has already been paid.');
    }

    const oid = this.generateOrderId(order.order_number || order.id);
    await this.run(
      `INSERT INTO payment_transactions (order_id, cmi_oid, amount, status)
       VALUES (?, ?, ?, 'pending')`,
      [order.id, oid, order.total]
    );

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
      await this.run(
        `UPDATE payment_transactions SET status = 'failed', error_message = ? WHERE cmi_oid = ? AND status = 'pending'`,
        ['Unable to initialize payment.', oid]
      );
      throw error;
    }
  }

  static async processSuccessPayment(oid, paymentData) {
    if (!oid || !this.verifyPayment(paymentData)) {
      throw new Error('Invalid CMI payment callback.');
    }

    await this.run('BEGIN IMMEDIATE TRANSACTION');
    try {
      const transaction = await this.get(
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
        await this.run('COMMIT');
        return { success: true, alreadyProcessed: true, orderId: transaction.order_id };
      }
      if (transaction.status !== 'pending') {
        throw new Error('Payment transaction is not pending.');
      }

      const paymentDataJson = JSON.stringify(this.sanitizePaymentData(paymentData));
      const transactionUpdate = await this.run(
        `UPDATE payment_transactions
         SET status = 'completed', payment_data = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`,
        [paymentDataJson, transaction.id]
      );
      if (transactionUpdate.changes !== 1) throw new Error('Payment transaction was already processed.');

      const orderUpdate = await this.run(
        `UPDATE orders
         SET payment_status = 'paid', status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
             payment_method = 'cmi', payment_details = ?
         WHERE id = ? AND payment_status != 'paid'`,
        [paymentDataJson, transaction.order_id]
      );
      if (orderUpdate.changes !== 1) throw new Error('Order payment state could not be updated.');

      const order = await this.get('SELECT user_id FROM orders WHERE id = ?', [transaction.order_id]);
      if (!order) throw new Error('Order not found.');
      await this.run('DELETE FROM cart WHERE user_id = ?', [order.user_id]);
      await this.run('COMMIT');

      console.log(`CMI payment completed for order ${transaction.order_id}`);
      return { success: true, alreadyProcessed: false, orderId: transaction.order_id };
    } catch (error) {
      try {
        await this.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('CMI payment rollback failed:', rollbackError.message);
      }
      throw error;
    }
  }

  static async processFailedPayment(oid, paymentData) {
    if (!oid || !this.verifyPayment(paymentData)) {
      throw new Error('Invalid CMI payment callback.');
    }

    const transaction = await this.get('SELECT * FROM payment_transactions WHERE cmi_oid = ?', [oid]);
    if (!transaction || transaction.status !== 'pending') return false;

    const safePaymentData = JSON.stringify(this.sanitizePaymentData(paymentData));
    await this.run(
      `UPDATE payment_transactions
       SET status = 'failed', payment_data = ?, error_message = ?
       WHERE id = ? AND status = 'pending'`,
      [safePaymentData, 'Payment was declined by CMI.', transaction.id]
    );
    await this.run(
      `UPDATE orders SET payment_status = 'failed', payment_method = 'cmi'
       WHERE id = ? AND payment_status != 'paid'`,
      [transaction.order_id]
    );

    console.log(`CMI payment failed for order ${transaction.order_id}`);
    return true;
  }
}

module.exports = CmiPaymentService;
