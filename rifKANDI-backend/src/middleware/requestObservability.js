const crypto = require('crypto');
const { log, normalizePath, recordRequest } = require('../services/observabilityService');
const ErrorTrackingService = require('../services/errorTrackingService');

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/;

const getRequestId = (req) => {
  const supplied = String(req.get('X-Request-ID') || '').trim();
  return REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
};

const requestObservability = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  req.requestId = getRequestId(req);
  res.setHeader('X-Request-ID', req.requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const path = normalizePath(req.path);
    recordRequest({
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
    });
    log(res.statusCode >= 500 ? 'error' : 'info', 'request_completed', {
      durationMs: Math.round(durationMs),
      method: req.method,
      path,
      requestId: req.requestId,
      statusCode: res.statusCode,
      userId: req.user?.id || undefined,
    });

    // A single completion hook covers both thrown errors and handlers that
    // intentionally return a 5xx response without throwing. Expected 4xx
    // validation outcomes are not operational errors and stay out of this feed.
    if (res.statusCode >= 500) {
      const failure = res.locals.errorTracking || {};
      ErrorTrackingService.recordSafely({
        source: 'backend',
        severity: 'error',
        errorName: failure.errorName || `HTTP_${res.statusCode}`,
        message: failure.message || `Backend request failed with status ${res.statusCode}.`,
        route: path,
        method: req.method,
        statusCode: res.statusCode,
        requestId: req.requestId,
        userId: req.user?.id,
      });
    }
  });

  next();
};

module.exports = requestObservability;
