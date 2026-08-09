const crypto = require('crypto');
const { log, normalizePath, recordRequest } = require('../services/observabilityService');

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
  });

  next();
};

module.exports = requestObservability;
