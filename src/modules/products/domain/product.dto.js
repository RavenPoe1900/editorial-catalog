/**
 * Joi schema for Product creation payload.
 * Validates GS1-like fields included in our model and basic constraints.
 */

const Joi = require("joi");

const manufacturerSchema = Joi.object({
  name: Joi.string().trim().min(2).required(),
  code: Joi.string().trim().optional(),
  country: Joi.string().trim().optional(),
});

module.exports = Joi.object({
  gtin: Joi.string()
    .pattern(/^\d{8,14}$/)
    .required()
    .messages({
      "string.pattern.base": "gtin must be numeric with 8-14 digits",
    }),
  name: Joi.string().trim().min(2).required(),
  description: Joi.string().trim().allow("").optional(),
  brand: Joi.string().trim().min(1).required(),
  manufacturer: manufacturerSchema.required(),
  netWeight: Joi.number().min(0).optional(),
  weightUnit: Joi.string().valid("g", "kg", "ml", "l", "oz", "lb").optional(),
});