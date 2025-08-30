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