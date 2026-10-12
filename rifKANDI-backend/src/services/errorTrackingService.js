const crypto = require('node:crypto');
const db = require('../config/database');
const { normalizePath } = require('./observabilityService');

const MAX_MESSAGE_LENGTH = 700;
const MAX_ERROR_NAME_LENGTH = 120;
const MAX_ROUTE_LENGTH = 240;
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_SOURCES = new Set(['backend', 'frontend']);
const SAFE_SEVERITIES = new Set(['error', 'warning']);

const run = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.run(sql, parameters, function onComplete(error) {
    if (error) return reject(error);
    return resolve({ id: this.lastID, changes: this.changes });
  });
});

const all = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.all(sql, parameters, (error, rows) => (error ? reject(error) : resolve(rows || [])));
});

const clip = (value, limit) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, limit);

// Error strings sometimes include copied request data. Keep diagnostics useful
// while removing common credential shapes before anything is persisted.
const redact = (value) => clip(value, MAX_MESSAGE_LENGTH)
  .replace(/\b(bearer|token|password|secret|authorization|cookie|session|api[_ -]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
  .replace(/\beyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\b/g, '[redacted-token]')
  .replace(/https?:\/\/[^\s)]+/gi, (url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch (_) {
      return '[redacted-url]';
    }
  });

const safeRoute = (value) => {
  const raw = String(value || '/').trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return clip(normalizePath(raw.split('?')[0]), MAX_ROUTE_LENGTH) || '/';
};

const safeStatusCode = (value) => {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
};

const toDatabaseTimestamp = (date) => date.toISOString().replace('T', ' ').replace('Z', '');

const fingerprintFor = ({ source, errorName, message, route, method, statusCode }) => crypto
  .createHash('sha256')
  .update([source, errorName, message, route, method || '', statusCode || ''].join('|'))
  .digest('hex')
  .slice(0, 32);

const normalizeEvent = (event = {}) => {
  const source = SAFE_SOURCES.has(event.source) ? event.source : 'backend';
  const severity = SAFE_SEVERITIES.has(event.severity) ? event.severity : 'error';
  const errorName = clip(event.errorName || 'Error', MAX_ERROR_NAME_LENGTH) || 'Error';
  const message = redact(event.message || 'An unexpected application error occurred.') || 'An unexpected application error occurred.';
  const route = safeRoute(event.route);
  const method = /^[A-Z]{3,8}$/.test(String(event.method || '').toUpperCase())
    ? String(event.method).toUpperCase()
    : null;
  const statusCode = safeStatusCode(event.statusCode);
  const requestId = clip(event.requestId, MAX_REQUEST_ID_LENGTH) || null;
  const userId = Number.isSafeInteger(Number(event.userId)) && Number(event.userId) > 0 ? Number(event.userId) : null;

  return {
    source,
    severity,
    errorName,
    message,
    route,
    method,
    statusCode,
    requestId,
    userId,
    fingerprint: fingerprintFor({ source, errorName, message, route, method, statusCode }),
  };
};

const record = async (event) => {
  const safe = normalizeEvent(event);
  await run(`
    INSERT INTO application_error_events
      (source, severity, fingerprint, error_name, message, route, method, status_code, request_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    safe.source, safe.severity, safe.fingerprint, safe.errorName, safe.message,
    safe.route, safe.method, safe.statusCode, safe.requestId, safe.userId,
  ]);
  return safe;
};

const recordSafely = (event) => record(event).catch((error) => {
  // Do not recurse through the application error handler. Tracking failure can
  // never interrupt marketplace actions or leak storage/database details.
  console.error(JSON.stringify({ level: 'error', event: 'error_tracking_write_failed', error: error.message }));
});

const dashboard = async ({ hours = 24, limit = 80 } = {}) => {
  const safeHours = Math.max(1, Math.min(24 * 30, Number.parseInt(hours, 10) || 24));
  const safeLimit = Math.max(10, Math.min(200, Number.parseInt(limit, 10) || 80));
  const since = toDatabaseTimestamp(new Date(Date.now() - safeHours * 60 * 60 * 1000));
  const [summaryRows, recentEvents, fingerprintRows] = await Promise.all([
    all(`
      SELECT source, severity, COUNT(*) AS count
      FROM application_error_events
      WHERE occurred_at >= ?
      GROUP BY source, severity
    `, [since]),
    all(`
      SELECT id, occurred_at, source, severity, fingerprint, error_name, message,
             route, method, status_code, request_id
      FROM application_error_events
      WHERE occurred_at >= ?
      ORDER BY occurred_at DESC, id DESC
      LIMIT ?
    `, [since, safeLimit]),
    all(`
      SELECT fingerprint, source, severity, error_name, message, route, method, status_code,
             COUNT(*) AS occurrences, MIN(occurred_at) AS first_seen, MAX(occurred_at) AS last_seen
      FROM application_error_events
      WHERE occurred_at >= ?
      GROUP BY fingerprint, source, severity, error_name, message, route, method, status_code
      ORDER BY occurrences DESC, last_seen DESC
      LIMIT 20
    `, [since]),
  ]);

  const summary = { total: 0, backend: 0, frontend: 0, warnings: 0, errors: 0 };
  for (const row of summaryRows) {
    const count = Number(row.count || 0);
    summary.total += count;
    if (row.source === 'backend') summary.backend += count;
    if (row.source === 'frontend') summary.frontend += count;
    if (row.severity === 'warning') summary.warnings += count;
    if (row.severity === 'error') summary.errors += count;
  }

  return { since, hours: safeHours, summary, events: recentEvents, fingerprints: fingerprintRows };
};

module.exports = { dashboard, normalizeEvent, record, recordSafely };
