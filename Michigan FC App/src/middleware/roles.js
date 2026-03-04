const { AppError } = require('../utils/errors');

/**
 * Returns middleware that checks req.user.roles against allowedRoles.
 * @param  {...string} allowedRoles  e.g. 'DIRECTOR', 'COACH'
 */
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !Array.isArray(req.user.roles)) {
      return next(new AppError('Unauthorized', 401));
    }
    const ok = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!ok) return next(new AppError('Forbidden – insufficient role', 403));
    next();
  };
}

module.exports = { authorize };
