const nodemailer = require('nodemailer');
const db = require('../config/database');

// Email transporter (use your Gmail or other SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

class EmailService {
  static async sendEmail(to, subject, html, type = 'general') {
    try {
      const info = await transporter.sendMail({
        from: `"rifKANDI" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      });
      
      // Log email
      db.run('INSERT INTO email_logs (recipient, subject, type, status) VALUES (?, ?, ?, ?)',
        [to, subject, type, 'sent']);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      db.run('INSERT INTO email_logs (recipient, subject, type, status, error_message) VALUES (?, ?, ?, ?, ?)',
        [to, subject, type, 'failed', error.message]);
      return { success: false, error: error.message };
    }
  }

  static async sendOrderConfirmation(order, user, items) {
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px;">${item.title}</td>
        <td style="padding: 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; text-align: right;">${item.price * item.quantity} MAD</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #87CEEB; padding: 20px; text-align: center;">
          <h1 style="color: #1a1a1a; margin: 0;">rifKANDI</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Order Confirmed! ✅</h2>
          <p>Order #: <strong>${order.order_number}</strong></p>
          <h3>Items:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
            ${itemsHtml}
            <tr style="border-top: 2px solid #e5e7eb;">
              <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${order.total} MAD</td>
            </tr>
          </table>
          <a href="${process.env.CLIENT_URL}/orders/${order.id}" style="background: #1a1a1a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">View Order →</a>
        </div>
        <div style="background: #f3f4f6; padding: 10px; text-align: center; font-size: 12px;">
          <p>rifKANDI – Your Moroccan Marketplace</p>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, `Order Confirmed #${order.order_number}`, html, 'order_confirmation');
  }

  static async sendOrderStatusUpdate(order, user, oldStatus, newStatus) {
    const statusMessages = {
      processing: 'Your order is being processed.',
      shipped: 'Your order has been shipped!',
      delivered: 'Your order has been delivered. Enjoy!',
      cancelled: 'Your order has been cancelled.'
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #87CEEB; padding: 20px; text-align: center;">
          <h1 style="color: #1a1a1a; margin: 0;">rifKANDI</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Order Status Update 🔄</h2>
          <p>Order #: <strong>${order.order_number}</strong></p>
          <p>Status changed from <strong>${oldStatus}</strong> to <strong>${newStatus}</strong></p>
          <p>${statusMessages[newStatus] || 'Check your order for updates.'}</p>
          <a href="${process.env.CLIENT_URL}/orders/${order.id}" style="background: #1a1a1a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Track Order →</a>
        </div>
        <div style="background: #f3f4f6; padding: 10px; text-align: center; font-size: 12px;">
          <p>rifKANDI – Your Moroccan Marketplace</p>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, `Order #${order.order_number} - ${newStatus.toUpperCase()}`, html, 'order_status');
  }
}

module.exports = EmailService;