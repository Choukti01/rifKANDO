const SibApiV3Sdk = require('@getbrevo/brevo');

// Configure Brevo API
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Send verification email
const sendVerificationEmail = async (email, code, name) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = 'Verify Your Email Address - rifKANDI';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .logo { text-align: center; margin-bottom: 32px; }
          .logo-text { font-size: 28px; font-weight: 800; color: #1a1a1a; }
          .logo-accent { color: #87CEEB; }
          h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 16px; text-align: center; }
          .code-box { background: #f0f7ff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; border: 1px solid #e0ecf8; }
          .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; font-family: monospace; }
          .text { color: #4a5568; line-height: 1.6; margin-bottom: 16px; }
          .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #a0aec0; font-size: 12px; }
          .button { display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 28px; border-radius: 40px; text-decoration: none; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">rif<span class="logo-accent">KANDI</span></span>
            </div>
            <h1>Verify Your Email Address</h1>
            <p class="text">Hello <strong>${name}</strong>,</p>
            <p class="text">Thank you for choosing rifKANDI! Please use the verification code below to complete your registration.</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p class="text">This code will expire in <strong>10 minutes</strong>.</p>
            <p class="text">If you didn't create an account with rifKANDI, please ignore this email.</p>
            <div class="footer">
              <p>rifKANDI - Morocco's Premier Multi-Service Platform</p>
              <p>&copy; 2024 rifKANDI. All rights reserved.</p>
              <p>Casablanca, Morocco</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `Hello ${name},\n\nThank you for choosing rifKANDI! Your verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account, please ignore this email.\n\nrifKANDI - Morocco's Premier Multi-Service Platform`;
    sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME, email: process.env.BREVO_FROM_EMAIL };
    sendSmtpEmail.to = [{ email: email, name: name }];
    
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Verification email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Brevo Error:', error.response?.body || error.message);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, code, name) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = 'Reset Your Password - rifKANDI';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .logo { text-align: center; margin-bottom: 32px; }
          .logo-text { font-size: 28px; font-weight: 800; color: #1a1a1a; }
          .logo-accent { color: #87CEEB; }
          h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 16px; text-align: center; }
          .code-box { background: #f0f7ff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; border: 1px solid #e0ecf8; }
          .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; font-family: monospace; }
          .warning { background: #fffbeb; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #fde68a; }
          .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #a0aec0; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">rif<span class="logo-accent">KANDI</span></span>
            </div>
            <h1>Reset Your Password</h1>
            <p class="text">Hello <strong>${name}</strong>,</p>
            <p class="text">We received a request to reset your password. Use the code below to create a new password.</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <div class="warning">
              <p style="color: #92400e; margin: 0;">⚠️ This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>rifKANDI - Morocco's Premier Multi-Service Platform</p>
              <p>&copy; 2024 rifKANDI. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `Hello ${name},\n\nWe received a request to reset your password. Your reset code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nrifKANDI - Morocco's Premier Multi-Service Platform`;
    sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME, email: process.env.BREVO_FROM_EMAIL };
    sendSmtpEmail.to = [{ email: email, name: name }];
    
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Brevo Error:', error.response?.body || error.message);
    throw new Error('Failed to send password reset email');
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = 'Welcome to rifKANDI! 🎉';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to rifKANDI</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .logo { text-align: center; margin-bottom: 32px; }
          .logo-text { font-size: 28px; font-weight: 800; color: #1a1a1a; }
          .logo-accent { color: #87CEEB; }
          h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 16px; text-align: center; }
          .feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 32px 0; }
          .feature { text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .feature-icon { font-size: 40px; margin-bottom: 12px; }
          .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #a0aec0; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">rif<span class="logo-accent">KANDI</span></span>
            </div>
            <h1>Welcome to rifKANDI, ${name}! 🎉</h1>
            <p class="text">We're thrilled to have you on board. rifKANDI is Morocco's first multi-service platform.</p>
            <div class="feature-grid">
              <div class="feature"><div class="feature-icon">🛍️</div><div>Shop Products</div></div>
              <div class="feature"><div class="feature-icon">📚</div><div>Take Courses</div></div>
              <div class="feature"><div class="feature-icon">🛠️</div><div>Hire Services</div></div>
              <div class="feature"><div class="feature-icon">💻</div><div>Download Digital</div></div>
            </div>
            <div class="footer">
              <p>rifKANDI - Morocco's Premier Multi-Service Platform</p>
              <p>&copy; 2024 rifKANDI. All rights reserved.</p>
              <p>Casablanca, Morocco</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `Welcome to rifKANDI, ${name}! 🎉\n\nWe're thrilled to have you on board. rifKANDI is Morocco's first multi-service platform.\n\nShop products, take courses, hire services, and download digital products - all in one place.\n\nrifKANDI - Morocco's Premier Multi-Service Platform`;
    sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME, email: process.env.BREVO_FROM_EMAIL };
    sendSmtpEmail.to = [{ email: email, name: name }];
    
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Brevo Error:', error.response?.body || error.message);
    return { success: false };
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail };