/**
 * @fileoverview Global Express error handling middleware.
 *
 * Responsibilities:
 *  - Normalize errors to JSON shape { status, message, additionalInfo? }.
 *  - Wrap unknown errors into CustomError with 500 status.
 *
 * Security:
 *  - Does not leak stack traces to clients (production safe). Logging can be expanded.
 *
 * Future:
 *  - Add correlation IDs, structured logging, error grouping.
 */
const CustomError = require("../utils/customError");
const { logger } = require("../utils/logger");

module.exports = (err, _req, res) => {
  let customError = err;
  if (!(err instanceof CustomError)) {
    logger(err.toString(), "ERROR", "red");
    customError = new CustomError("Server Error", 500);
  }
  res.status(customError.status || 500).json({
    status: customError.status || 500,
    message: customError.message || "Server Error",
    additionalInfo: customError.additionalInfo || undefined,
  });
};