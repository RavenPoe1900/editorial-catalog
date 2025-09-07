/**
 * @fileoverview Joi schema for User creation.
 *
 * Validations:
 *  - role id existence deferred to an async external validator (ensure referential integrity).
 *
 * Security:
 *  - Basic password length only; strengthen with complexity rule if needed.
 */
const Joi = require("joi");
const validateIdExistence = require("../../../_shared/middlewares/validate/idExist.validate");
const RoleService = require("../../roles/application/role.service");

const message = "Role id not exist";

module.exports = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string()
    .length(24)
    .external(validateIdExistence(RoleService, message))
    .required(),
});