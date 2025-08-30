/**
 * auth.routers.js
 *
 * Defines authentication routes:
 *  - POST /register
 *  - POST /login
 *  - GET /me         (requires authentication middleware)
 *  - POST /refresh
 *
 * The DTO middleware validates request bodies for register/login.
 */

const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const authenticationMiddleware = require("../../_shared/middlewares/authentication.middleware");
const authDto = require("../domain/auth.dto");
const validateBodyDto = require("../../_shared/middlewares/validate/dtoBody.validate");

// Validate request body using Joi DTO
router.post("/register", validateBodyDto(authDto), authController.register);
router.post("/login", validateBodyDto(authDto), authController.login);

// Protected route to get current user
router.get("/me", authenticationMiddleware, authController.getUser);

// Refresh route: body or cookie handled in controller
router.post("/refresh", authController.refreshToken);

module.exports = router;