const { AppError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // Operational errors we threw on purpose
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  // Unexpected errors
  console.error('[ERROR]', err);
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(500).json({ success: false, error: message });
}

module.exports = { errorHandler };
