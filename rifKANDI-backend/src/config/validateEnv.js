const REQUIRED_PRODUCTION_ENV = [
  'JWT_SECRET',
  'CLIENT_URL',
  'GOOGLE_CLIENT_ID',
  'DATABASE_PATH'
];

const validateEnvironment = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (!process.env.CLIENT_URL.startsWith('https://')) {
    throw new Error('CLIENT_URL must use https in production');
  }
};

module.exports = { validateEnvironment };
