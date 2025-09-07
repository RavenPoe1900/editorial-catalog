/**
 * @fileoverview Joi schema for validating product update payload (audit module context).
 *
 * Notes:
 *  - Mirrors product update constraints but leaves semantic status changes
 *    to dedicated operations.
 *  - All fields optional to support partial updates.
 *
 * Reuse:
 *  - For audit-specific processing you can reuse this or the main productUpdate schema.
 */
const Joi = require("joi");

const manufacturerSchema = Joi.object({
  name: Joi.string().trim().min(2).optional(),
  code: Joi.string().trim().optional(),
  country: Joi.string().trim().optional(),
});

module.exports = Joi.object({
  gtin: Joi.string()
    .pattern(/^\d{8,14}$/)
    .optional()
    .messages({
      "string.pattern.base": "gtin must be numeric with 8-14 digits",
    }),
  name: Joi.string().trim().min(2).optional(),
  description: Joi.string().trim().allow("").optional(),
  brand: Joi.string().trim().min(1).optional(),
  manufacturer: manufacturerSchema.optional(),
  netWeight: Joi.number().min(0).optional(),
  weightUnit: Joi.string().valid("g", "kg", "ml", "l", "oz", "lb").optional(),
});