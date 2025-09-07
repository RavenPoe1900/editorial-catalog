/**
 * @fileoverview Generic pagination DTO (page + limit).
 *
 * Usage:
 *  - Attach to query validation for endpoints expecting pagination controls.
 *
 * Conventions:
 *  - page is 0-based (consistent with service layer).
 *  - limit bounded to 250 to avoid accidental large result sets.
 *
 * Extend:
 *  - Add sort / order fields if needed.
 */
const Joi = require("joi");

module.exports = Joi.object({
  page: Joi.number().integer().min(0).example(1),
  limit: Joi.number().integer().min(1).max(250).example(10),
});