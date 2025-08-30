class CustomError extends Error {
  constructor(message, status = 500, additionalInfo = null) {
    super(message);
    this.status = status;
    this.additionalInfo = additionalInfo;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;