/**
 * @fileoverview Joi schema for Product update.
 *
 * Constraints:
 *  - All fields optional.
 *  - status excluded (special approval workflow).
 *
 * NOTE:
 *  - If no effective change detected later, service returns current doc (no audit entry).
 */
const Joi = require("joi");
const { isValidGTIN } = require("./gtin.util");

const manufacturerSchema = Joi.object({
  name: Joi.string().trim().min(2).optional(),
  code: Joi.string().trim().optional(),
  country: Joi.string().trim().optional(),
});

module.exports = Joi.object({
  gtin: Joi.string()
    .trim()
    .pattern(/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/)
    .custom((value, helpers) => {
      if (!isValidGTIN(value)) {
        return helpers.error("any.invalid", { message: "Invalid GTIN check digit" });
      }
      return value;
    }, "GTIN check digit validation")
    .optional()
    .messages({
      "string.pattern.base": "gtin must be numeric and 8, 12, 13 or 14 digits",
      "any.invalid": "gtin has an invalid check digit",
    }),
  name: Joi.string().trim().min(2).optional(),
  description: Joi.string().trim().allow("").optional(),
  brand: Joi.string().trim().min(1).optional(),
  manufacturer: manufacturerSchema.optional(),
  netWeight: Joi.number().min(0).optional(),
  weightUnit: Joi.string().valid("g", "kg", "ml", "l", "oz", "lb").optional(),
});