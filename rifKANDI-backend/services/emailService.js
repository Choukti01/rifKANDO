const { sendEmail, getWelcomeTemplate, getOrderConfirmationTemplate, getPasswordResetTemplate } = require('../config/email');

class EmailService {
  static async sendWelcomeEmail(userEmail, userName) {
    return await sendEmail({
      to: userEmail,
      subject: 'Welcome to rifKANDI! 🎉',
      html: getWelcomeTemplate(userName)
    });
  }

  static async sendOrderConfirmation(orderEmail, orderNumber, items, total, shippingAddress) {
    return await sendEmail({
      to: orderEmail,
      subject: `Order Confirmed #${orderNumber}`,
      html: getOrderConfirmationTemplate(orderNumber, items, total, shippingAddress)
    });
  }

  static async sendPasswordResetEmail(userEmail, resetUrl, code) {
    return await sendEmail({
      to: userEmail,
      subject: 'Reset Your rifKANDI Password',
      html: getPasswordResetTemplate(resetUrl, code)
    });
  }
}

module.exports = EmailService;