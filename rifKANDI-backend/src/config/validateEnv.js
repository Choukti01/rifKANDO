const path = require('node:path');
const { validateFeatureFlags } = require('../services/featureFlagService');

const REQUIRED_PRODUCTION_ENV = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'AUDIT_LOG_SECRET',
  'PHONE_OTP_SECRET',
  'CLIENT_URL',
];

const APPLICATION_ENVIRONMENTS = new Set(['development', 'test', 'staging', 'production']);

const getApplicationEnvironment = () => {
  const explicitEnvironment = String(process.env.APP_ENV || '').trim().toLowerCase();
  const environment = explicitEnvironment || String(process.env.NODE_ENV || 'development').trim().toLowerCase();
  if (!APPLICATION_ENVIRONMENTS.has(environment)) {
    throw new Error('APP_ENV must be one of development, test, staging, or production.');
  }
  return environment;
};

const isDeploymentEnvironment = () => ['staging', 'production'].includes(getApplicationEnvironment());

const normalizeOrigin = (value, variableName) => {
  try {
    const url = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('must be an origin without a path');
    }
    return url.origin;
  } catch (error) {
    throw new Error(`${variableName} must be a valid HTTP(S) origin without a path.`);
  }
};

const normalizeHttpsUrl = (value, variableName) => {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('must be an HTTPS URL without credentials, query, or fragment');
    }
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    throw new Error(`${variableName} must be a valid HTTPS URL without credentials, query, or fragment.`);
  }
};

const normalizeSecureOrigin = (value, variableName) => {
  const origin = normalizeOrigin(value, variableName);
  if (!origin.startsWith('https://')) {
    throw new Error(`${variableName} must use HTTPS in staging and production.`);
  }
  return origin;
};

const assertStrongDistinctSecrets = () => {
  const secretNames = ['JWT_SECRET', 'SESSION_SECRET', 'AUDIT_LOG_SECRET', 'PHONE_OTP_SECRET'];
  const secrets = secretNames.map((name) => process.env[name]);
  for (const [index, secret] of secrets.entries()) {
    const name = secretNames[index];
    if (secret.length < 32) throw new Error(`${name} must be at least 32 characters in production.`);
    if (/(replace-with|change[-_ ]?me|your[-_ ]|example|default[-_ ]?secret)/i.test(secret)) {
      throw new Error(`${name} must not use a placeholder value in staging or production.`);
    }
  }
  if (new Set(secrets).size !== secrets.length) {
    throw new Error('JWT_SECRET, SESSION_SECRET, AUDIT_LOG_SECRET, and PHONE_OTP_SECRET must be different values.');
  }
};

const isValidBucketName = (value) => /^[a-z0-9](?:[a-z0-9.-]{1,61})[a-z0-9]$/.test(value) && !value.includes('..');

const getPersistentStorageRoot = () => path.resolve(process.env.PERSISTENT_STORAGE_ROOT || '/var/data');

const assertWithinPersistentStorageRoot = (value, variableName) => {
  const persistentStorageRoot = getPersistentStorageRoot();
  const resolvedValue = path.resolve(value);

  if (persistentStorageRoot === path.parse(persistentStorageRoot).root) {
    throw new Error('PERSISTENT_STORAGE_ROOT must not be a filesystem root.');
  }

  if (resolvedValue !== persistentStorageRoot && !resolvedValue.startsWith(`${persistentStorageRoot}${path.sep}`)) {
    throw new Error(`${variableName} must be located inside PERSISTENT_STORAGE_ROOT in production.`);
  }
};

const getDatabaseEngine = () => {
  const engine = String(process.env.DATABASE_ENGINE || 'sqlite').trim().toLowerCase();
  if (!['sqlite', 'postgres'].includes(engine)) {
    throw new Error('DATABASE_ENGINE must be either sqlite or postgres.');
  }
  return engine;
};

const validatePostgresUrl = () => {
  if (!process.env.DATABASE_URL || !String(process.env.DATABASE_URL).trim()) {
    throw new Error('DATABASE_URL is required when DATABASE_ENGINE=postgres.');
  }

  try {
    const url = new URL(process.env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.hash) {
      throw new Error('invalid PostgreSQL URL');
    }
  } catch (error) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  if (process.env.POSTGRES_SSL && !['true', 'false'].includes(process.env.POSTGRES_SSL)) {
    throw new Error('POSTGRES_SSL must be true or false when set.');
  }
};

const validateDatabaseConfiguration = () => {
  const engine = getDatabaseEngine();
  if (engine === 'postgres') {
    validatePostgresUrl();
    return engine;
  }

  if (!process.env.DATABASE_PATH) {
    throw new Error('DATABASE_PATH is required when DATABASE_ENGINE=sqlite.');
  }
  if (process.env.NODE_ENV === 'production') {
    assertWithinPersistentStorageRoot(process.env.DATABASE_PATH, 'DATABASE_PATH');
  }
  return engine;
};

const validateObjectStorage = () => {
  const driver = (process.env.OBJECT_STORAGE_DRIVER || 'local').toLowerCase();
  if (!['local', 's3'].includes(driver)) {
    throw new Error('OBJECT_STORAGE_DRIVER must be either local or s3.');
  }

  if (driver === 'local') {
    const uploadsDir = process.env.UPLOADS_DIR || '/var/data/uploads';
    if (process.env.NODE_ENV === 'production') {
      assertWithinPersistentStorageRoot(uploadsDir, 'UPLOADS_DIR');
    }
    return;
  }

  const required = [
    'OBJECT_STORAGE_ENDPOINT',
    'OBJECT_STORAGE_REGION',
    'OBJECT_STORAGE_PUBLIC_BUCKET',
    'OBJECT_STORAGE_PRIVATE_BUCKET',
    'OBJECT_STORAGE_ACCESS_KEY_ID',
    'OBJECT_STORAGE_SECRET_ACCESS_KEY',
    'OBJECT_STORAGE_PUBLIC_BASE_URL',
  ];
  const missing = required.filter((name) => !process.env[name] || !String(process.env[name]).trim());
  if (missing.length > 0) {
    throw new Error(`Missing required S3 object storage environment variables: ${missing.join(', ')}`);
  }

  normalizeHttpsUrl(process.env.OBJECT_STORAGE_ENDPOINT, 'OBJECT_STORAGE_ENDPOINT');
  const publicBaseUrl = normalizeHttpsUrl(process.env.OBJECT_STORAGE_PUBLIC_BASE_URL, 'OBJECT_STORAGE_PUBLIC_BASE_URL');
  if (publicBaseUrl === normalizeHttpsUrl(process.env.OBJECT_STORAGE_ENDPOINT, 'OBJECT_STORAGE_ENDPOINT')) {
    throw new Error('OBJECT_STORAGE_PUBLIC_BASE_URL must not expose the private S3 endpoint.');
  }
  if (!isValidBucketName(process.env.OBJECT_STORAGE_PUBLIC_BUCKET) || !isValidBucketName(process.env.OBJECT_STORAGE_PRIVATE_BUCKET)) {
    throw new Error('Object storage bucket names are invalid.');
  }
  if (process.env.OBJECT_STORAGE_PUBLIC_BUCKET === process.env.OBJECT_STORAGE_PRIVATE_BUCKET) {
    throw new Error('Public and private object storage buckets must be different.');
  }
  if (['OBJECT_STORAGE_REGION', 'OBJECT_STORAGE_ACCESS_KEY_ID', 'OBJECT_STORAGE_SECRET_ACCESS_KEY']
    .some((name) => String(process.env[name]).trim() !== process.env[name] || /\s/.test(process.env[name]))) {
    throw new Error('Object storage region and credentials must not contain whitespace.');
  }
  if (process.env.OBJECT_STORAGE_FORCE_PATH_STYLE && !['true', 'false'].includes(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE)) {
    throw new Error('OBJECT_STORAGE_FORCE_PATH_STYLE must be true or false when set.');
  }
};

const validateSmsConfiguration = () => {
  const provider = String(process.env.SMS_PROVIDER || '').trim().toLowerCase();
  // SMS is optional at launch. Its absence must not take down products,
  // FINDit, COD, or Google authentication; the phone endpoints return a
  // clear 503 until a real provider is configured.
  if (!provider) return;
  if (provider !== 'twilio') {
    throw new Error('SMS_PROVIDER must be twilio for phone authentication.');
  }
  const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
  const missing = required.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length > 0 || (!String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim() && !String(process.env.TWILIO_FROM_NUMBER || '').trim())) {
    throw new Error('Twilio SMS configuration is incomplete. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER.');
  }
};

const getAllowedOrigins = () => {
  const deployed = isDeploymentEnvironment();
  const defaults = deployed
    ? [process.env.CLIENT_URL]
    : ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_URL];
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = [...configured, ...defaults.filter(Boolean)]
    .map((origin) => (deployed
      ? normalizeSecureOrigin(origin, 'ALLOWED_ORIGINS')
      : normalizeOrigin(origin, 'ALLOWED_ORIGINS')));
  return [...new Set(origins)];
};

const validateEnvironment = () => {
  validateFeatureFlags();
  const applicationEnvironment = getApplicationEnvironment();
  if (process.env.NODE_ENV === 'production' && !isDeploymentEnvironment()) {
    throw new Error('APP_ENV must be staging or production when NODE_ENV is production.');
  }
  if (!isDeploymentEnvironment()) return;
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(`APP_ENV=${applicationEnvironment} requires NODE_ENV=production for deployment safety.`);
  }

  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  assertStrongDistinctSecrets();
  normalizeSecureOrigin(process.env.CLIENT_URL, 'CLIENT_URL');
  getAllowedOrigins();

  validateDatabaseConfiguration();
  validateObjectStorage();
  validateSmsConfiguration();
  const cmiVariables = ['CMI_STORE_KEY', 'CMI_CLIENT_ID', 'BACKEND_URL'];
  const configuredCmiVariables = cmiVariables.filter((name) => Boolean(process.env[name]));
  if (configuredCmiVariables.length > 0 && configuredCmiVariables.length !== cmiVariables.length) {
    throw new Error('CMI_STORE_KEY, CMI_CLIENT_ID, and BACKEND_URL must be configured together.');
  }
  if (process.env.BACKEND_URL) normalizeSecureOrigin(process.env.BACKEND_URL, 'BACKEND_URL');
};

module.exports = {
  getAllowedOrigins,
  getApplicationEnvironment,
  isDeploymentEnvironment,
  getDatabaseEngine,
  validateEnvironment,
  validateDatabaseConfiguration,
  validateObjectStorage,
  validateSmsConfiguration,
  assertWithinPersistentStorageRoot,
};
