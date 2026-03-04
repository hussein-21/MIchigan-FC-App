class AppError extends Error {
  /**
   * @param {string} message  – human-readable error
   * @param {number} statusCode – HTTP status (default 500)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };
