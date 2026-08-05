const AppError = require('../utils/AppError');

const toOperationalError = (err) => {
  if (err.name === 'JsonWebTokenError') return new AppError('Invalid token. Please log in again.', 401);
  if (err.name === 'TokenExpiredError') return new AppError('Your token has expired. Please log in again.', 401);
  if (err.type === 'entity.too.large') return new AppError('Request body is too large.', 413);
  if (err.type === 'entity.parse.failed') return new AppError('Request body contains invalid JSON.', 400);
  return err;
};

module.exports = (err, req, res, next) => {
  const error = toOperationalError(err);
  const statusCode = error.statusCode || 500;
  const isOperational = Boolean(error.isOperational);
  const log = {
    level: statusCode >= 500 ? 'error' : 'warn',
    event: 'request_failed',
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    errorName: error.name,
    errorCode: error.code,
    message: error.message,
  };
  if (!isOperational) log.stack = error.stack;
  console.error(JSON.stringify(log));

  if (res.headersSent) return next(error);
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      status: 'error',
      message: error.message,
      requestId: req.requestId,
      stack: error.stack,
    });
  }

  return res.status(isOperational ? statusCode : 500).json({
    status: 'error',
    message: isOperational ? error.message : 'Something went wrong.',
    requestId: req.requestId,
  });
};
