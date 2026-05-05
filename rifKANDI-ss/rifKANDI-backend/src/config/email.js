const nodemailer = require('nodemailer');

// Create transporter for Gmail (synchronous, no top-level await)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

// Send email function
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"rifKANDI" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    });
    
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return { success: false, error: error.message };
  }
};

// Email templates (plain functions, no async)
const getWelcomeTemplate = (name) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #87CEEB; padding: 20px; text-align: center;">
      <h1 style="color: #1a1a1a; margin: 0;">rifKANDI</h1>
    </div>
    <div style="padding: 20px; background: white;">
      <h2>Welcome ${name}! 🎉</h2>
      <p>Thank you for joining rifKANDI – Morocco's premier marketplace.</p>
      <p>Start exploring thousands of products, courses, services, and more.</p>
      <a href="${process.env.CLIENT_URL}/products" style="background: #1a1a1a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Shop Now →</a>
    </div>
    <div style="background: #f3f4f6; padding: 10px; text-align: center; font-size: 12px;">
      <p>rifKANDI – Your Moroccan Marketplace</p>
    </div>
  </div>
`;

const getOrderConfirmationTemplate = (orderNumber, items, total, shippingAddress) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #87CEEB; padding: 20px; text-align: center;">
      <h1 style="color: #1a1a1a; margin: 0;">Order Confirmed! ✅</h1>
    </div>
    <div style="padding: 20px; background: white;">
      <h2>Thank you for your order!</h2>
      <p><strong>Order #:</strong> ${orderNumber}</p>
      <h3>Items:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; text-align: left;">Item</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Total</th>
         </tr>
        ${items.map(item => `
          <tr>
            <td style="padding: 8px;">${item.title}</td>
            <td style="padding: 8px; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; text-align: right;">${item.price * item.quantity} MAD</td>
          </tr>
        `).join('')}
        <tr style="border-top: 2px solid #e5e7eb;">
          <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${total} MAD</td>
        </tr>
      </table>
      <h3>Shipping Address:</h3>
      <p>${typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress)}</p>
      <a href="${process.env.CLIENT_URL}/orders/${orderNumber}" style="background: #1a1a1a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Order →</a>
    </div>
    <div style="background: #f3f4f6; padding: 10px; text-align: center; font-size: 12px;">
      <p>rifKANDI – Your Moroccan Marketplace</p>
    </div>
  </div>
`;

const getPasswordResetTemplate = (resetUrl, code) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #87CEEB; padding: 20px; text-align: center;">
      <h1 style="color: #1a1a1a; margin: 0;">Reset Password 🔑</h1>
    </div>
    <div style="padding: 20px; background: white;">
      <h2>Password Reset Request</h2>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="background: #87CEEB; color: #1a1a1a; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      <p>Or use this code: <strong>${code}</strong></p>
      <p>This link expires in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
    <div style="background: #f3f4f6; padding: 10px; text-align: center; font-size: 12px;">
      <p>rifKANDI – Your Moroccan Marketplace</p>
    </div>
  </div>
`;

module.exports = {
  sendEmail,
  getWelcomeTemplate,
  getOrderConfirmationTemplate,
  getPasswordResetTemplate
};