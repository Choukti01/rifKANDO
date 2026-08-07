const assert = require('node:assert/strict');
const {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlags,
  requireFeature,
  validateFeatureFlags,
} = require('../src/services/featureFlagService');

const originalFlags = process.env.FEATURE_FLAGS;

const withFlags = (value, callback) => {
  if (value === undefined) delete process.env.FEATURE_FLAGS;
  else process.env.FEATURE_FLAGS = value;
  try {
    callback();
  } finally {
    if (originalFlags === undefined) delete process.env.FEATURE_FLAGS;
    else process.env.FEATURE_FLAGS = originalFlags;
  }
};

withFlags(undefined, () => {
  assert.deepEqual(getFeatureFlags(), DEFAULT_FEATURE_FLAGS);
});

withFlags('checkout=false, cmi_payments=off, digital_downloads=true', () => {
  assert.deepEqual(getFeatureFlags(), {
    checkout: false,
    cmi_payments: false,
    digital_downloads: true,
  });
});

withFlags('checkout=true,checkout=false', () => {
  assert.throws(validateFeatureFlags, /more than once/);
});

withFlags('unknown_feature=true', () => {
  assert.throws(validateFeatureFlags, /unknown feature/);
});

withFlags('checkout=false', () => {
  const response = {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;
  requireFeature('checkout')({}, response, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(response.headers['Retry-After'], '300');
  assert.equal(response.body.code, 'FEATURE_DISABLED');
});

console.log('Feature flag smoke test passed.');
