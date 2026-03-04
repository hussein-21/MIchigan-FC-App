const { ZodError } = require('zod');
const { AppError } = require('../utils/errors');

/**
 * Returns middleware that validates req.body against a Zod schema.
 * On success the parsed (coerced) result replaces req.body.
 */
function validate(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const msg = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        return next(new AppError(msg, 400));
      }
      next(err);
    }
  };
}

module.exports = { validate };
