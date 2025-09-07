/**
 * @fileoverview Joi schema for Role creation payload.
 *
 * Responsibilities:
 *  - Validate incoming "name" field matches allowed role enum values.
 *
 * Limitations:
 *  - Enum list defined in shared RoleTypeEnum (imported).
 *  - Does not handle updates (see roleUpdate.dto.js).
 *
 * Security:
 *  - Strict enum prevents privilege escalation by arbitrary string role injection.
 */
const Joi = require("joi");
const RoleTypeEnum = require("../../../_shared/enum/roles.enum");

module.exports = Joi.object({
  name: Joi.string()
    .valid(RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER, RoleTypeEnum.EMPLOYEE, RoleTypeEnum.PROVIDER, RoleTypeEnum.EDITOR)
    .required()
    .messages({
      "string.empty": "Name is required",
      "any.only": `Name must be one of ${Object.values(RoleTypeEnum).join(", ")}`,
    }),
});