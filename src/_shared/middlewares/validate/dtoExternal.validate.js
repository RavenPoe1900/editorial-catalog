/**
 * @fileoverview Middleware for body validation with potential external async rules (Joi.validateAsync).
 *
 * Differences from dtoBody.validate:
 *  - Uses schema.validateAsync inside try/catch.
 *  - Captures Joi validation errors (error.details) and responds 400.
 *
 * WARNING:
 *  - External validators may trigger side effects (DB lookups); ensure idempotency.
 */

function validateExternalDto(schema) {
  return async (req, res, next) => {
    try {
      await schema.validateAsync(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });
      next();
    } catch (error) {
      res
        .status(400)
        .json({ errors: error.details.map((err) => err.message) });
    }
  };
}

module.exports = validateExternalDto;