const REQUIRED_PRODUCTION_ENV = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'AUDIT_LOG_SECRET',
  'CLIENT_URL',
  'GOOGLE_CLIENT_ID',
  'DATABASE_PATH',
];

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

const isValidBucketName = (value) => /^[a-z0-9](?:[a-z0-9.-]{1,61})[a-z0-9]$/.test(value) && !value.includes('..');

const validateObjectStorage = () => {
  const driver = (process.env.OBJECT_STORAGE_DRIVER || 'local').toLowerCase();
  if (!['local', 's3'].includes(driver)) {
    throw new Error('OBJECT_STORAGE_DRIVER must be either local or s3.');
  }

  if (driver === 'local') {
    const uploadsDir = process.env.UPLOADS_DIR || '/var/data/uploads';
    if (process.env.NODE_ENV === 'production' && !uploadsDir.startsWith('/var/data/')) {
      throw new Error('UPLOADS_DIR must point to the mounted persistent disk in production.');
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

const getAllowedOrigins = () => {
  const defaults = process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL]
    : ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_URL];
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = [...configured, ...defaults.filter(Boolean)]
    .map((origin) => normalizeOrigin(origin, 'ALLOWED_ORIGINS'));
  return [...new Set(origins)];
};

const validateEnvironment = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  if (process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production.');
  }
  if (process.env.AUDIT_LOG_SECRET.length < 32) {
    throw new Error('AUDIT_LOG_SECRET must be at least 32 characters in production.');
  }
  normalizeOrigin(process.env.CLIENT_URL, 'CLIENT_URL');
  getAllowedOrigins();

  if (!process.env.DATABASE_PATH.startsWith('/var/data/')) {
    throw new Error('DATABASE_PATH must point to the mounted persistent disk in production.');
  }
  validateObjectStorage();
  const cmiVariables = ['CMI_STORE_KEY', 'CMI_CLIENT_ID', 'BACKEND_URL'];
  const configuredCmiVariables = cmiVariables.filter((name) => Boolean(process.env[name]));
  if (configuredCmiVariables.length > 0 && configuredCmiVariables.length !== cmiVariables.length) {
    throw new Error('CMI_STORE_KEY, CMI_CLIENT_ID, and BACKEND_URL must be configured together.');
  }
  if (process.env.BACKEND_URL) normalizeOrigin(process.env.BACKEND_URL, 'BACKEND_URL');
};

module.exports = { getAllowedOrigins, validateEnvironment, validateObjectStorage };
