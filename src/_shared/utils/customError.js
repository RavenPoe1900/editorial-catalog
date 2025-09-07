/**
 * @fileoverview CustomError (already documented previously) - repeated for completeness.
 *
 * Use Cases:
 *  - Throw from service/controller with specific HTTP status and metadata.
 *
 * Logging:
 *  - Downstream error handler logs message; stack retained internally.
 */
class CustomError extends Error {
  constructor(message, status = 500, additionalInfo = null) {
    super(message);
    this.status = status;
    this.additionalInfo = additionalInfo;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;