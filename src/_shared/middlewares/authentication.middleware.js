/**
 * authentication.middleware.js
 *
 * Express middleware to verify access tokens (JWT).
 * - Expects Authorization header: "Bearer <accessToken>" OR a plain token string.
 * - Verifies token using config.JWT.key.
 * - On success attaches the decoded payload to req.user (e.g. { userId, iat, exp }).
 *
 * Important:
 * - Do not leak verification error details to clients in production. Logging is fine for debugging.
 */

const jwt = require("jsonwebtoken");
const config = require("../config/config"); // relative path to config

module.exports = (req, res, next) => {
  const header = req.header("Authorization");

  if (!header) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  // Support header variants: "Bearer <token>" or just "<token>"
  const token = header.startsWith("Bearer ") ? header.substring(7) : header;

  if (!token) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  try {
    // Verify the access token using the access key
    const decoded = jwt.verify(token, config.JWT.key);

    // Attach the decoded payload for downstream handlers (controllers)
    req.user = decoded; // controllers expect req.user.userId or req.user

    next();
  } catch (err) {
    // Log server-side for debugging; do not expose stack traces to clients
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ error: "Token is not valid" });
  }
};