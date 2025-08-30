const express = require("express");
const roleController = require("./roles.controller");
const router = express.Router();
const roleDto = require("../domain/role.dto");
const updateRoleDto = require("../domain/roleUpdate.dto");
const validateBodyDto = require("../../_shared/middlewares/validate/dtoBody.validate");
const validateId = require("../../_shared/middlewares/validate/id.validate");
const authenticationMiddleware = require("../../_shared/middlewares/authentication.middleware");
const authorizationMiddleware = require("../../_shared/middlewares/authorization.middleware");
const roleDeleteMiddleware = require("../../_shared/middlewares/roleDelete.middleware");
const RoleTypeEnum = require("../../_shared/enum/roles.enum");
const paginateDto = require("../../_shared/joi/paginateDto.joi");
const validateQueryDto = require("../../_shared/middlewares/validate/dtoQuery.validate");

const middleAccess = [
  RoleTypeEnum.ADMIN,
  RoleTypeEnum.MANAGER,
  RoleTypeEnum.EMPLOYEE,
];

router.post(
  "/",
  validateBodyDto(roleDto),
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  roleController.createRole
);

router.get(
  "/",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateQueryDto(paginateDto),
  roleController.getAllRoles
);

router.get(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  roleController.getRoleById
);

router.put(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  validateBodyDto(updateRoleDto),
  roleController.updateRole
);

router.delete(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  roleController.softDeleteRole
);

router.delete(
  "/permanent/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  roleDeleteMiddleware,
  roleController.deleteRole
);

module.exports = router;
