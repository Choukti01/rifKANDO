const crypto = require('node:crypto');

const RECEIPT_VERSION = 1;
const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;

const receiptSecret = () => {
  const secret = process.env.DIGITAL_UPLOAD_RECEIPT_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret || String(secret).length < 32) {
    throw new Error('A strong session secret is required to secure digital uploads.');
  }
  return secret;
};

const sign = (encodedPayload) => crypto
  .createHmac('sha256', receiptSecret())
  .update(encodedPayload)
  .digest('base64url');

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const fileSha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const createUploadReceipt = ({ key, sellerId, fileName, fileSize, contentType, sha256 }) => {
  const now = Date.now();
  const payload = {
    version: RECEIPT_VERSION,
    key,
    sellerId: Number(sellerId),
    fileName,
    fileSize: Number(fileSize),
    contentType,
    sha256,
    issuedAt: now,
    expiresAt: now + RECEIPT_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return {
    receipt: `${encodedPayload}.${sign(encodedPayload)}`,
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };
};

const verifyUploadReceipt = ({ receipt, storageReference, sellerId }) => {
  if (typeof receipt !== 'string' || receipt.length > 4_096) {
    throw new Error('Upload receipt is missing or invalid. Upload the file again.');
  }
  const [encodedPayload, signature, ...extra] = receipt.split('.');
  if (!encodedPayload || !signature || extra.length || !safeEqual(signature, sign(encodedPayload))) {
    throw new Error('Upload receipt is invalid. Upload the file again.');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch (_) {
    throw new Error('Upload receipt is invalid. Upload the file again.');
  }

  const expectedReference = `storage://${payload?.key || ''}`;
  if (
    payload?.version !== RECEIPT_VERSION ||
    !Number.isSafeInteger(payload?.sellerId) ||
    payload.sellerId !== Number(sellerId) ||
    !Number.isSafeInteger(payload?.fileSize) || payload.fileSize < 1 ||
    typeof payload?.fileName !== 'string' || payload.fileName.length < 1 || payload.fileName.length > 255 ||
    typeof payload?.contentType !== 'string' || payload.contentType.length < 1 || payload.contentType.length > 128 ||
    !/^[a-f0-9]{64}$/.test(payload?.sha256 || '') ||
    expectedReference !== storageReference
  ) {
    throw new Error('Upload receipt does not match this file. Upload the file again.');
  }
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt < Date.now()) {
    throw new Error('Upload receipt has expired. Upload the file again.');
  }
  return payload;
};

module.exports = {
  createUploadReceipt,
  fileSha256,
  verifyUploadReceipt,
};
