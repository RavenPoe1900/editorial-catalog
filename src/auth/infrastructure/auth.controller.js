/**
 * auth.controller.js
 *
 * Controller layer for authentication routes.
 * - Delegates business logic to application/auth.service.js
 * - Supports receiving refresh token either in the request body or in HttpOnly cookie
 *
 * Note:
 * - The controller performs minimal processing; most logic is in the service layer.
 */

const authService = require("../application/auth.service");

exports.register = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.register(email, password);
  res.status(result.status).json(result);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  // Pass req/res optionally so service can set cookies if desired
  const result = await authService.login(email, password, req, res);
  res.status(result.status).json(result);
};

exports.refreshToken = async (req, res) => {
  // Support token via body OR HttpOnly cookie (cookie-parser must be used in app)
  const refreshToken = req.body && req.body.refreshToken
    ? req.body.refreshToken
    : (req.cookies && req.cookies.refreshToken ? req.cookies.refreshToken : null);

  const result = await authService.refreshToken(refreshToken, req, res);
  res.status(result.status).json(result);
};

exports.getUser = async (req, res) => {
  // req.user is the decoded JWT payload (set by authentication middleware).
  // For compatibility, support both decoded payload and raw id.
  const userId = (req.user && req.user.userId) ? req.user.userId : req.user;
  const result = await authService.getUser(userId);
  res.status(result.status).json(result);
};