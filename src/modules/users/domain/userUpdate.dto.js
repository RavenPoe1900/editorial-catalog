/**
 * @fileoverview Joi schema for User update.
 *
 * All fields optional; only validated if present.
 * Role existence validated externally if provided.
 */
const Joi = require("joi");
const validateIdExistence = require("../../../_shared/middlewares/validate/idExist.validate");
const RoleService = require("../../roles/application/role.service");

const roleMessage = "Role id not exist";

module.exports = Joi.object({
  name: Joi.string().optional().min(3),
  email: Joi.string().optional().email(),
  password: Joi.string().optional().min(6),
  role: Joi.string()
    .optional()
    .length(24)
    .external(validateIdExistence(RoleService, roleMessage)),
});