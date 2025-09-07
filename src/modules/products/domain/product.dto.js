/**
 * @fileoverview Joi schema for Product creation.
 *
 * Validation:
 *  - GTIN pattern + check digit validator (custom).
 *  - manufacturer nested object required.
 *
 * Business:
 *  - status intentionally excluded (set in service based on actor role).
 */
const Joi = require("joi");
const { isValidGTIN } = require("./gtin.util");

const manufacturerSchema = Joi.object({
  name: Joi.string().trim().min(2).required(),
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
    .required()
    .messages({
      "string.pattern.base": "gtin must be numeric and 8, 12, 13 or 14 digits",
      "any.invalid": "gtin has an invalid check digit",
      "any.required": "gtin is required",
    }),
  name: Joi.string().trim().min(2).required(),
  description: Joi.string().trim().allow("").optional(),
  brand: Joi.string().trim().min(1).required(),
  manufacturer: manufacturerSchema.required(),
  netWeight: Joi.number().min(0).optional(),
  weightUnit: Joi.string().valid("g", "kg", "ml", "l", "oz", "lb").optional(),
});