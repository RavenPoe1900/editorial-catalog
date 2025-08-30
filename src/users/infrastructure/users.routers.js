const express = require("express");
const userController = require("./users.controller");
const router = express.Router();
const userDto = require("../domain/user.dto");
const updateUserDto = require("../domain/userUpdate.dto");
const validateExternalDto = require("../../_shared/middlewares/validate/dtoExternal.validate");
const validateId = require("../../_shared/middlewares/validate/id.validate");
const authenticationMiddleware = require("../../_shared/middlewares/authentication.middleware");
const authorizationMiddleware = require("../../_shared/middlewares/authorization.middleware");
const RoleTypeEnum = require("../../_shared/enum/roles.enum");
const paginateDto = require("../../_shared/joi/paginateDto.joi");
const validateQueryDto = require("../../_shared/middlewares/validate/dtoQuery.validate");

const middleAccess = [RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER];

router.post(
  "/",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateExternalDto(userDto),
  userController.createUser
);

router.get(
  "/",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateQueryDto(paginateDto),
  userController.getAllUsers
);

router.get(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  userController.getUserById
);

router.put(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  validateExternalDto(updateUserDto),
  userController.updateUser
);

router.delete(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  userController.softDeleteUser
);

module.exports = router;
