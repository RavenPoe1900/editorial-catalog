/**
 * @fileoverview Middleware factory for body validation using Joi (synchronous path).
 *
 * Behavior:
 *  - Validates req.body, collects all errors (abortEarly: false).
 *  - Replaces req.body with validated/coerced value.
 *  - Responds 400 with aggregated error messages.
 *
 * Limitations:
 *  - Does not support async external validations (use validateAsync wrapper if needed).
 */

function validateBodyDto(schema) {
  return async (req, res, next) => {
    const { error: joiError, value } = await schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
    });

    const errors = joiError ? joiError.details.map((err) => err.message) : [];
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    req.body = value;
    next();
  };
}

module.exports = validateBodyDto;