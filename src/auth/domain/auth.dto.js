/**
 * auth.dto.js
 *
 * Joi schema for authentication request bodies (register and login).
 * - Validates email and password fields
 */

const Joi = require("joi");

module.exports = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});