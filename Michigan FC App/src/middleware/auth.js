const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/errors');

function authenticate(req, _res, next) {
  const hdr = req.headers.authorization;
  if (!hdr || !hdr.startsWith('Bearer ')) {
    return next(new AppError('Missing or malformed Authorization header', 401));
  }
  try {
    req.user = jwt.verify(hdr.slice(7), config.jwt.secret);
    // req.user = { id, email, roles, iat, exp }
    next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
}

module.exports = { authenticate };
