const jwt = require("jsonwebtoken");
const config = require("../_shared/config/config");

/**
 * Build per-request GraphQL context.
 * - Parses Authorization header if present ("Bearer <token>" or raw token).
 * - Attaches a minimal user object: { userId, role, roles } or null if anonymous.
 * - Does not block when token is missing/invalid; @auth directive enforces protection.
 */
module.exports.buildContext = async ({ req }) => {
  let user = null;

  const header = req.header("Authorization");
  if (header) {
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT.key);
        const { userId, role } = decoded || {};
        if (userId) {
          user = {
            userId,
            role: role || null,
            roles: role ? [role] : [],
          };
        }
      } catch {
        // Ignore invalid tokens; protected fields will be blocked by @auth anyway
      }
    }
  }

  return { req, user };
};