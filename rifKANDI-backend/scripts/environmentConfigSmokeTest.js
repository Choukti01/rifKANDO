const assert = require('node:assert/strict');
const {
  getAllowedOrigins,
  validateEnvironment,
} = require('../src/config/validateEnv');

const trackedNames = [
  'NODE_ENV', 'APP_ENV', 'JWT_SECRET', 'SESSION_SECRET', 'AUDIT_LOG_SECRET',
  'CLIENT_URL', 'ALLOWED_ORIGINS', 'GOOGLE_CLIENT_ID', 'DATABASE_PATH',
  'OBJECT_STORAGE_DRIVER', 'UPLOADS_DIR', 'CMI_STORE_KEY', 'CMI_CLIENT_ID', 'BACKEND_URL',
  'FEATURE_FLAGS',
];

const originalEnvironment = Object.fromEntries(trackedNames.map((name) => [name, process.env[name]]));

const withEnvironment = (values, callback) => {
  for (const name of trackedNames) {
    if (values[name] === undefined) delete process.env[name];
    else process.env[name] = values[name];
  }
  try {
    callback();
  } finally {
    for (const name of trackedNames) {
      if (originalEnvironment[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnvironment[name];
    }
  }
};

const deploymentEnvironment = (overrides = {}) => ({
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  JWT_SECRET: 'a'.repeat(48),
  SESSION_SECRET: 'b'.repeat(48),
  AUDIT_LOG_SECRET: 'c'.repeat(48),
  CLIENT_URL: 'https://staging.rifkando.example',
  ALLOWED_ORIGINS: 'https://staging.rifkando.example',
  GOOGLE_CLIENT_ID: 'staging-client.apps.googleusercontent.com',
  DATABASE_PATH: '/var/data/rifkandi.db',
  OBJECT_STORAGE_DRIVER: 'local',
  UPLOADS_DIR: '/var/data/uploads',
  CMI_STORE_KEY: undefined,
  CMI_CLIENT_ID: undefined,
  BACKEND_URL: undefined,
  FEATURE_FLAGS: undefined,
  ...overrides,
});

withEnvironment(deploymentEnvironment(), () => {
  assert.doesNotThrow(validateEnvironment);
  assert.deepEqual(getAllowedOrigins(), ['https://staging.rifkando.example']);
});

withEnvironment(deploymentEnvironment({ NODE_ENV: 'development' }), () => {
  assert.throws(validateEnvironment, /requires NODE_ENV=production/);
});

withEnvironment(deploymentEnvironment({ SESSION_SECRET: 'a'.repeat(48) }), () => {
  assert.throws(validateEnvironment, /must be different values/);
});

withEnvironment(deploymentEnvironment({ CLIENT_URL: 'http://staging.rifkando.example' }), () => {
  assert.throws(validateEnvironment, /must use HTTPS/);
});

withEnvironment(deploymentEnvironment({ APP_ENV: 'preview' }), () => {
  assert.throws(validateEnvironment, /APP_ENV must be one of/);
});

console.log('Environment configuration smoke test passed.');
