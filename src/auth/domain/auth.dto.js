/**
 * @fileoverview Auth input DTOs (Joi).
 *
 * Responsibilities:
 *  - Provide consistent validation schemas for login & registration.
 *  - Centralize constraints (lengths, formats).
 *
 * Non-Goals:
 *  - Does not enforce password complexity beyond length (extend if needed).
 *  - Role name semantic validation occurs at persistence layer (role lookup).
 */
const Joi = require("joi");

const emailRule = Joi.string().email().max(254).required();
const passwordRule = Joi.string().min(6).max(128).required();

const loginDto = Joi.object({
  email: emailRule,
  password: passwordRule,
});

const registerDto = Joi.object({
  email: emailRule,
  password: passwordRule,
  name: Joi.string().min(2).max(120).required(),
  role: Joi.string().min(3).max(50).required(), // DB-level semantic enforcement.
});

module.exports = {
  loginDto,
  registerDto,
};