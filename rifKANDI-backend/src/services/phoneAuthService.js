const crypto = require('node:crypto');

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 4;

class PhoneAuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PhoneAuthError';
    this.statusCode = statusCode;
  }
}

function normalizePhoneNumber(value) {
  const compact = String(value || '').trim().replace(/[\s().-]/g, '');
  const moroccanLocal = compact.replace(/^0/, '');
  const normalized = /^0[5-7]\d{8}$/.test(compact)
    ? `+212${moroccanLocal}`
    : /^212[5-7]\d{8}$/.test(compact)
      ? `+${compact}`
      : compact;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new PhoneAuthError('Enter a valid mobile number with its country code. Moroccan numbers may start with 0.');
  }
  return normalized;
}

function otpSecret() {
  const secret = process.env.PHONE_OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new PhoneAuthError('Phone authentication is not configured.', 503);
  return secret;
}

function generateCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashCode(phone, code) {
  return crypto
    .createHmac('sha256', otpSecret())
    .update(`phone-otp:${phone}:${code}`)
    .digest('hex');
}

function timingSafeCodeMatch(phone, code, expectedHash) {
  const providedHash = Buffer.from(hashCode(phone, code), 'hex');
  const expected = Buffer.from(String(expectedHash || ''), 'hex');
  return expected.length === providedHash.length && crypto.timingSafeEqual(expected, providedHash);
}

function twilioConfiguration() {
  if (String(process.env.SMS_PROVIDER || '').toLowerCase() !== 'twilio') {
    throw new PhoneAuthError('SMS delivery is not configured. Please contact rifKANDO support.', 503);
  }

  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const messagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  const from = String(process.env.TWILIO_FROM_NUMBER || '').trim();
  if (!accountSid || !authToken || (!messagingServiceSid && !from)) {
    throw new PhoneAuthError('SMS delivery is not configured. Please contact rifKANDO support.', 503);
  }

  return { accountSid, authToken, messagingServiceSid, from };
}

async function sendVerificationCode(phone, code) {
  const config = twilioConfiguration();
  const body = new URLSearchParams({
    To: phone,
    Body: `rifKANDO security code: ${code}. It expires in 10 minutes. Do not share this code.`,
  });
  if (config.messagingServiceSid) body.set('MessagingServiceSid', config.messagingServiceSid);
  else body.set('From', config.from);

  let response;
  try {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new PhoneAuthError('We could not send your SMS code. Please try again shortly.', 503);
  }

  if (!response.ok) {
    throw new PhoneAuthError('We could not send your SMS code. Please try again shortly.', 503);
  }
}

module.exports = {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_TTL_MS,
  PhoneAuthError,
  generateCode,
  hashCode,
  normalizePhoneNumber,
  sendVerificationCode,
  timingSafeCodeMatch,
  twilioConfiguration,
};
