const crypto = require('node:crypto');
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require('@simplewebauthn/server');
const db = require('../config/database');
const sessionService = require('./sessionService');

const CHALLENGE_COOKIE = 'rifkando_passkey_challenge';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const get = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.get(sql, parameters, (error, row) => (error ? reject(error) : resolve(row)));
});

const all = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.all(sql, parameters, (error, rows) => (error ? reject(error) : resolve(rows)));
});

const run = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.run(sql, parameters, function onRun(error) {
    if (error) return reject(error);
    return resolve({ changes: this.changes || 0, lastID: this.lastID });
  });
});

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

const challengeSecret = () => {
  const secret = process.env.PASSKEY_CHALLENGE_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret || String(secret).length < 32) throw new Error('Passkey challenge signing is not configured.');
  return secret;
};

const isProduction = () => process.env.NODE_ENV === 'production';

const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/api/auth/passkeys',
  maxAge: CHALLENGE_TTL_MS,
});

const clearCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/api/auth/passkeys',
});

const getConfig = (allowedOrigins) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
  const defaultRpId = isProduction() ? new URL(clientUrl).hostname.replace(/^www\./, '') : 'localhost';
  const rpID = String(process.env.PASSKEY_RP_ID || defaultRpId).trim().toLowerCase();
  const configuredOrigins = String(process.env.PASSKEY_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const expectedOrigins = [...new Set(configuredOrigins.length > 0 ? configuredOrigins : allowedOrigins)];

  if (!rpID || expectedOrigins.length === 0) throw new Error('Passkey relying-party configuration is incomplete.');
  return { rpID, rpName: 'rifKANDO', expectedOrigins };
};

const issueChallenge = async (response, {
  purpose,
  userId = null,
  webauthnUserId = null,
  registrationName = null,
  registrationEmail = null,
}) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const challenge = crypto
    .createHmac('sha256', challengeSecret())
    .update(token, 'utf8')
    .digest('base64url');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

  await run('DELETE FROM passkey_challenges WHERE expires_at <= CURRENT_TIMESTAMP', []);
  await run(
    `INSERT INTO passkey_challenges (
      token_hash, purpose, user_id, webauthn_user_id, registration_name, registration_email, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tokenHash, purpose, userId, webauthnUserId, registrationName, registrationEmail, expiresAt]
  );
  response.cookie(CHALLENGE_COOKIE, token, cookieOptions());
  return challenge;
};

const consumeChallenge = async (request, response, purpose) => {
  const token = sessionService.readCookies(request)[CHALLENGE_COOKIE];
  response.clearCookie(CHALLENGE_COOKIE, clearCookieOptions());
  if (!token || token.length < 40) throw new Error('The passkey request expired. Please start again.');

  const tokenHash = sha256(token);
  const challenge = await get(
    `SELECT token_hash, purpose, user_id, webauthn_user_id, registration_name, registration_email, expires_at
     FROM passkey_challenges
     WHERE token_hash = ? AND purpose = ? AND expires_at > CURRENT_TIMESTAMP`,
    [tokenHash, purpose]
  );
  const deleted = await run('DELETE FROM passkey_challenges WHERE token_hash = ?', [tokenHash]);
  if (!challenge || deleted.changes !== 1) throw new Error('The passkey request expired. Please start again.');

  const expectedChallenge = crypto
    .createHmac('sha256', challengeSecret())
    .update(token, 'utf8')
    .digest('base64url');
  return { ...challenge, expectedChallenge };
};

const listCredentialsForUser = (userId) => all(
  `SELECT credential_id, public_key, counter, transports, device_type, backed_up
   FROM passkey_credentials
   WHERE user_id = ?
   ORDER BY created_at ASC`,
  [userId]
);

const listPublicCredentialsForUser = async (userId) => {
  const credentials = await all(
    `SELECT credential_id, device_type, backed_up, name, created_at, last_used_at
     FROM passkey_credentials
     WHERE user_id = ?
     ORDER BY created_at ASC`,
    [userId]
  );
  return credentials.map((credential) => ({
    id: credential.credential_id,
    name: credential.name,
    deviceType: credential.device_type,
    backedUp: Boolean(credential.backed_up),
    createdAt: credential.created_at,
    lastUsedAt: credential.last_used_at,
  }));
};

const registrationOptions = async ({ response, user = null, registration = null, allowedOrigins }) => {
  const config = getConfig(allowedOrigins);
  const userName = user?.email || registration?.name;
  const userDisplayName = user?.name || registration?.name;
  if (!userName || !userDisplayName) throw new Error('Passkey registration details are incomplete.');
  const credentials = user ? await listCredentialsForUser(user.id) : [];
  const webauthnUserId = crypto.randomBytes(32).toString('base64url');
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    // v14 requires raw user-handle bytes. The base64url representation is
    // persisted separately so it can be safely stored in SQLite/PostgreSQL.
    userID: Buffer.from(webauthnUserId, 'base64url'),
    userName,
    userDisplayName,
    attestationType: 'none',
    excludeCredentials: credentials.map((credential) => ({
      id: credential.credential_id,
      transports: JSON.parse(credential.transports || '[]'),
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });
  const challenge = await issueChallenge(response, {
    purpose: 'registration',
    userId: user?.id || null,
    webauthnUserId,
    registrationName: registration?.name || null,
    registrationEmail: registration?.email || null,
  });
  return { ...options, challenge };
};

const verifyRegistration = async ({ request, response, credential, allowedOrigins }) => {
  const config = getConfig(allowedOrigins);
  const challenge = await consumeChallenge(request, response, 'registration');
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: challenge.expectedChallenge,
    expectedOrigin: config.expectedOrigins,
    expectedRPID: config.rpID,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) throw new Error('Your passkey could not be verified.');

  const { credential: verifiedCredential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  return {
    userId: challenge.user_id === null || challenge.user_id === undefined ? null : Number(challenge.user_id),
    registrationName: challenge.registration_name || null,
    registrationEmail: challenge.registration_email || null,
    webauthnUserId: challenge.webauthn_user_id,
    credential: {
      id: verifiedCredential.id,
      publicKey: Buffer.from(verifiedCredential.publicKey).toString('base64url'),
      counter: verifiedCredential.counter,
      transports: verifiedCredential.transports || [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    },
  };
};

const storeCredential = async ({ userId, webauthnUserId, credential }) => {
  await run(
    `INSERT INTO passkey_credentials (
      credential_id, user_id, webauthn_user_id, public_key, counter, transports, device_type, backed_up, name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      credential.id,
      userId,
      webauthnUserId,
      credential.publicKey,
      credential.counter,
      JSON.stringify(credential.transports || []),
      credential.deviceType,
      credential.backedUp,
      'Passkey',
    ]
  );
  return { userId: Number(userId), credentialId: credential.id };
};

const authenticationOptions = async ({ response, user = null, allowedOrigins }) => {
  const config = getConfig(allowedOrigins);
  const credentials = user ? await listCredentialsForUser(user.id) : [];
  if (user && credentials.length === 0) {
    const error = new Error('No passkey is registered for this account.');
    error.statusCode = 404;
    throw error;
  }
  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    userVerification: 'required',
    ...(credentials.length > 0 ? {
      allowCredentials: credentials.map((credential) => ({
        id: credential.credential_id,
        transports: JSON.parse(credential.transports || '[]'),
      })),
    } : {}),
  });
  const challenge = await issueChallenge(response, { purpose: 'authentication', userId: user?.id || null });
  return { ...options, challenge };
};

const verifyAuthentication = async ({ request, response, credential, allowedOrigins }) => {
  const config = getConfig(allowedOrigins);
  const challenge = await consumeChallenge(request, response, 'authentication');
  const storedCredential = challenge.user_id
    ? await get(
      `SELECT credential_id, user_id, public_key, counter, transports
       FROM passkey_credentials
       WHERE credential_id = ? AND user_id = ?`,
      [credential?.id, challenge.user_id]
    )
    : await get(
      `SELECT credential_id, user_id, public_key, counter, transports
       FROM passkey_credentials
       WHERE credential_id = ?`,
      [credential?.id]
    );
  if (!storedCredential) throw new Error('This passkey is not registered for this account.');

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: challenge.expectedChallenge,
    expectedOrigin: config.expectedOrigins,
    expectedRPID: config.rpID,
    requireUserVerification: true,
    credential: {
      id: storedCredential.credential_id,
      publicKey: Buffer.from(storedCredential.public_key, 'base64url'),
      counter: Number(storedCredential.counter || 0),
      transports: JSON.parse(storedCredential.transports || '[]'),
    },
  });
  if (!verification.verified) throw new Error('Your passkey could not be verified.');

  await run(
    'UPDATE passkey_credentials SET counter = ?, last_used_at = CURRENT_TIMESTAMP WHERE credential_id = ? AND user_id = ?',
    [verification.authenticationInfo.newCounter, storedCredential.credential_id, storedCredential.user_id]
  );
  return { userId: Number(storedCredential.user_id), credentialId: storedCredential.credential_id };
};

const deleteCredential = async ({ userId, credentialId }) => {
  const count = await get('SELECT COUNT(*) AS count FROM passkey_credentials WHERE user_id = ?', [userId]);
  if (Number(count?.count || 0) <= 1) {
    const error = new Error('Keep at least one passkey on your account.');
    error.statusCode = 409;
    throw error;
  }
  const result = await run('DELETE FROM passkey_credentials WHERE credential_id = ? AND user_id = ?', [credentialId, userId]);
  if (result.changes !== 1) {
    const error = new Error('Passkey not found.');
    error.statusCode = 404;
    throw error;
  }
};

module.exports = {
  authenticationOptions,
  deleteCredential,
  listPublicCredentialsForUser,
  registrationOptions,
  storeCredential,
  verifyAuthentication,
  verifyRegistration,
};
