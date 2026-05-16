// backend/services/cmiPaymentService.js
const cmi = require('cmi-payment-nodejs');
const config = require('../config/cmi');
const db = require('../config/database');

class CmiPaymentService {
  /**
   * Generate unique order ID for CMI
   * Format: RIF-{timestamp}-{random}
   */
  static generateOrderId(orderNumber) {
    return `RIF-${orderNumber}-${Date.now()}`;
  }

  /**
   * Initialize CMI payment and return HTML form
   * @param {Object} order - Order object from database
   * @param {Object} user - User object
   * @param {Array} items - Order items
   * @returns {Object} HTML form for redirect and oid
   */
  static initiatePayment(order, user, items) {
    const oid = this.generateOrderId(order.order_number || order.id);
    
    console.log('💰 Initializing CMI payment:', { 
      orderId: order.id, 
      oid, 
      amount: order.total,
      amountType: typeof order.total
    });
    
    // Store order_id mapping for callback
    db.run(`
      INSERT INTO payment_transactions (order_id, cmi_oid, amount, status)
      VALUES (?, ?, ?, 'pending')
    `, [order.id, oid, order.total], (err) => {
      if (err) console.error('Error saving transaction:', err.message);
    });

    // Initialize CMI client with configuration
    // IMPORTANT: amount MUST be a string, not a number!
    const CmiClient = new cmi.default({
      storekey: config.storekey,
      clientid: config.clientid,
      oid: oid,
      shopurl: config.shopurl,
      okUrl: config.okUrl,
      failUrl: config.failUrl,
      callbackURL: config.callbackURL,
      amount: order.total.toString(), // ← FIXED: Convert to string
      email: user.email,
      BillToName: user.name,
      tel: user.phone || '',
      currency: config.currency,
      lang: config.lang,
    });

    // Generate the HTML form for redirect
    const htmlForm = CmiClient.redirect_post();
    
    return {
      htmlForm,
      oid,
    };
  }

  /**
   * Verify payment response from CMI callback
   * @param {Object} params - CMI callback parameters
   * @returns {Object} Verification result
   */
  static verifyPayment(params) {
    const CmiClient = new cmi.default({
      storekey: config.storekey,
      clientid: config.clientid,
    });
    
    return CmiClient.verify(params);
  }

  /**
   * Process successful payment
   * @param {string} oid - CMI order ID
   * @param {Object} paymentData - Payment response data
   */
  static async processSuccessPayment(oid, paymentData) {
    // Get the original order
    const transaction = await this.getTransactionByOid(oid);
    if (!transaction) {
      console.error(`Transaction not found for OID: ${oid}`);
      return false;
    }

    // Update transaction status
    await this.updateTransaction(transaction.id, {
      status: 'completed',
      payment_data: JSON.stringify(paymentData),
      completed_at: new Date().toISOString(),
    });

    // Update order payment status
    await this.updateOrderPayment(transaction.order_id, {
      payment_status: 'paid',
      status: 'processing',
      payment_method: 'cmi',
      payment_details: JSON.stringify(paymentData),
    });

    // Clear user's cart
    await this.clearUserCart(transaction.order_id);

    console.log(`✅ Payment successful for order ${transaction.order_id}`);
    return true;
  }

  /**
   * Process failed payment
   * @param {string} oid - CMI order ID
   * @param {Object} paymentData - Payment response data
   */
  static async processFailedPayment(oid, paymentData) {
    const transaction = await this.getTransactionByOid(oid);
    if (!transaction) return false;

    await this.updateTransaction(transaction.id, {
      status: 'failed',
      payment_data: JSON.stringify(paymentData),
      error_message: paymentData.errmsg || paymentData.ErrMsg || 'Payment failed',
    });

    await this.updateOrderPayment(transaction.order_id, {
      payment_status: 'failed',
      payment_method: 'cmi',
    });

    console.log(`❌ Payment failed for order ${transaction.order_id}`);
    return true;
  }

  // Helper methods
  static getTransactionByOid(oid) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM payment_transactions WHERE cmi_oid = ?', [oid], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static updateTransaction(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      Object.keys(data).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      });
      values.push(id);
      db.run(`UPDATE payment_transactions SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  static updateOrderPayment(orderId, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      Object.keys(data).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      });
      values.push(orderId);
      db.run(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  static clearUserCart(orderId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT user_id FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err || !order) return resolve(false);
        db.run('DELETE FROM cart WHERE user_id = ?', [order.user_id], function(err) {
          if (err) reject(err);
          else resolve(true);
        });
      });
    });
  }
}

module.exports = CmiPaymentService;