const startedAt = new Date();
const metrics = {
  errors: 0,
  requestDurationTotalMs: 0,
  requestDurationMaxMs: 0,
  requestsByRoute: new Map(),
  requestsByStatus: new Map(),
  requestsTotal: 0,
};

const normalizePath = (pathname = '/') => {
  const normalized = String(pathname).split('?')[0] || '/';
  const segments = normalized.split('/').map((segment) => {
    if (/^\d+$/.test(segment)) return ':id';
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ':id';
    if (segment.length > 80) return ':value';
    return segment;
  });

  return segments.join('/') || '/';
};

const increment = (collection, key) => {
  collection.set(key, (collection.get(key) || 0) + 1);
};

const log = (level, event, fields = {}) => {
  if (process.env.NODE_ENV === 'test' && process.env.LOG_REQUESTS_IN_TEST !== 'true') return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const output = JSON.stringify(entry);

  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
};

const recordRequest = ({ method, path, statusCode, durationMs }) => {
  const safeDurationMs = Math.max(0, Math.round(Number(durationMs) || 0));
  const routeKey = `${String(method || 'GET').toUpperCase()} ${normalizePath(path)}`;

  metrics.requestsTotal += 1;
  metrics.requestDurationTotalMs += safeDurationMs;
  metrics.requestDurationMaxMs = Math.max(metrics.requestDurationMaxMs, safeDurationMs);
  if (Number(statusCode) >= 500) metrics.errors += 1;
  increment(metrics.requestsByRoute, routeKey);
  increment(metrics.requestsByStatus, String(statusCode || 0));
};

const snapshot = () => ({
  collectedAt: new Date().toISOString(),
  startedAt: startedAt.toISOString(),
  uptimeSeconds: Math.round(process.uptime()),
  http: {
    averageDurationMs: metrics.requestsTotal
      ? Math.round(metrics.requestDurationTotalMs / metrics.requestsTotal)
      : 0,
    errors: metrics.errors,
    maxDurationMs: metrics.requestDurationMaxMs,
    requestsByRoute: Object.fromEntries(metrics.requestsByRoute),
    requestsByStatus: Object.fromEntries(metrics.requestsByStatus),
    requestsTotal: metrics.requestsTotal,
  },
  process: {
    memoryRssBytes: process.memoryUsage().rss,
    nodeVersion: process.version,
  },
});

module.exports = {
  log,
  normalizePath,
  recordRequest,
  snapshot,
};
