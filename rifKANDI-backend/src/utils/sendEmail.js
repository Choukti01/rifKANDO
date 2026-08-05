const { Resend } = require('resend');

let resendClient;

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    const error = new Error('Email delivery is not configured.');
    error.statusCode = 503;
    error.isOperational = true;
    throw error;
  }
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
};

const send = (message) => getResendClient().emails.send({
  from: process.env.EMAIL_FROM,
  ...message,
});

exports.sendVerificationEmail = async (email, code) => send({
  to: email,
  subject: 'Verify your RifKANDO account',
  html: `
    <h2>Welcome to RifKANDO</h2>
    <p>Your verification code is:</p>
    <h1>${code}</h1>
    <p>This code expires in 10 minutes.</p>
  `,
});

exports.sendWelcomeEmail = async (email, name) => send({
  to: email,
  subject: 'Welcome to RifKANDO',
  html: `<h2>Welcome, ${name}!</h2><p>Your RifKANDO account is verified and ready to use.</p>`,
});

exports.sendLoginNotificationEmail = async (email, name) => send({
  to: email,
  subject: 'New sign-in to RifKANDO account',
  html: `<p>Hello ${name},</p><p>We noticed a successful sign-in to your RifKANDO account.</p><p>If this was not you, contact support immediately.</p>`,
});
