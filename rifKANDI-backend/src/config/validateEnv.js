const REQUIRED_PRODUCTION_ENV = [
  'JWT_SECRET',
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
  normalizeOrigin(process.env.CLIENT_URL, 'CLIENT_URL');
  getAllowedOrigins();

  if (!process.env.DATABASE_PATH.startsWith('/var/data/')) {
    throw new Error('DATABASE_PATH must point to the mounted persistent disk in production.');
  }
  const cmiVariables = ['CMI_STORE_KEY', 'CMI_CLIENT_ID', 'BACKEND_URL'];
  const configuredCmiVariables = cmiVariables.filter((name) => Boolean(process.env[name]));
  if (configuredCmiVariables.length > 0 && configuredCmiVariables.length !== cmiVariables.length) {
    throw new Error('CMI_STORE_KEY, CMI_CLIENT_ID, and BACKEND_URL must be configured together.');
  }
  if (process.env.BACKEND_URL) normalizeOrigin(process.env.BACKEND_URL, 'BACKEND_URL');
};

module.exports = { getAllowedOrigins, validateEnvironment };
