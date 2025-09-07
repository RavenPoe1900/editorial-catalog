/**
 * @fileoverview Joi schema for Role update payload.
 *
 * Responsibilities:
 *  - Allow partial update (currently only 'name').
 *
 * Security:
 *  - Same enum restriction as creation schema.
 *
 * Future:
 *  - Add immutability warning if some roles become system-locked.
 */
const Joi = require("joi");
const RoleTypeEnum = require("../../../_shared/enum/roles.enum");

module.exports = Joi.object({
  name: Joi.string()
    .optional()
    .valid(RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER, RoleTypeEnum.EMPLOYEE, RoleTypeEnum.PROVIDER, RoleTypeEnum.EDITOR)
    .messages({
      "string.empty": "Name cannot be empty",
      "any.only": `Name must be one of ${Object.values(RoleTypeEnum).join(", ")}`,
    }),
});