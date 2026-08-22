const DEFAULT_FEATURE_FLAGS = Object.freeze({
  checkout: true,
  // Focused launch: products and FINDit use COD only. Parked domains stay in
  // source but are unavailable until their own launch checks are complete.
  cmi_payments: false,
  wallet_payments: false,
  digital_downloads: false,
  courses: false,
  services: false,
  digital: false,
});

const featureNames = new Set(Object.keys(DEFAULT_FEATURE_FLAGS));

const parseFlagValue = (value, featureName) => {
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'on'].includes(normalized)) return true;
  if (['false', '0', 'off'].includes(normalized)) return false;
  throw new Error(`FEATURE_FLAGS value for ${featureName} must be true or false.`);
};

const getFeatureFlags = () => {
  const configured = String(process.env.FEATURE_FLAGS || '').trim();
  if (!configured) return { ...DEFAULT_FEATURE_FLAGS };

  const flags = { ...DEFAULT_FEATURE_FLAGS };
  const seen = new Set();
  for (const entry of configured.split(',')) {
    const [featureName, ...values] = entry.split('=').map((value) => value.trim());
    if (!featureName || values.length !== 1 || !values[0]) {
      throw new Error('FEATURE_FLAGS must use comma-separated name=true or name=false values.');
    }
    if (!featureNames.has(featureName)) {
      throw new Error(`FEATURE_FLAGS contains an unknown feature: ${featureName}.`);
    }
    if (seen.has(featureName)) {
      throw new Error(`FEATURE_FLAGS configures ${featureName} more than once.`);
    }
    seen.add(featureName);
    flags[featureName] = parseFlagValue(values[0], featureName);
  }
  return flags;
};

const validateFeatureFlags = () => {
  getFeatureFlags();
};

const requireFeature = (featureName) => {
  if (!featureNames.has(featureName)) {
    throw new Error(`Unknown feature flag requested by the application: ${featureName}.`);
  }

  return (req, res, next) => {
    if (getFeatureFlags()[featureName]) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '300');
    return res.status(503).json({
      error: 'This operation is temporarily unavailable. Please try again later.',
      code: 'FEATURE_DISABLED',
    });
  };
};

module.exports = {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlags,
  requireFeature,
  validateFeatureFlags,
};
