/**
 * @fileoverview Middleware for validating query string parameters with Joi.
 *
 * Behavior:
 *  - Validates req.query fully (no unknown keys).
 *  - Replaces req.query with validated result.
 */

function validateQueryDto(schema) {
  return async (req, res, next) => {
    const { error: joiError, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
    });

    const errors = joiError ? joiError.details.map((err) => err.message) : [];
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    req.query = value;
    next();
  };
}

module.exports = validateQueryDto;