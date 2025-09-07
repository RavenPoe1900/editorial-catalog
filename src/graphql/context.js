/**
 * @fileoverview GraphQL context builder.
 *
 * Responsibilities:
 *  - Extract Authorization header across multiple adapters (express, graphql-http).
 *  - Verify access token (if present) and inject { userId, role, roles[] } into context.
 *  - Fail-soft: invalid/expired token yields anonymous user (user = null).
 *
 * Security:
 *  - Does not throw on invalid token to allow public root fields (protected resolvers use @auth).
 *  - Ensure reverse proxy sanitizes duplicate Authorization headers in production.
 *
 * Extension Points:
 *  - Add request ID / correlation ID.
 *  - Attach per-request cache (e.g. DataLoader) here.
 *  - Add IP / UA logging for auditing.
 */
const jwt = require("jsonwebtoken");
const config = require("../_shared/config/config");

module.exports.buildContext = async (contextInput) => {
  const reqWrapper = contextInput?.req || contextInput || {};
  const req = reqWrapper.raw || reqWrapper;

  const readAuthHeader = () => {
    try {
      if (req && typeof req.get === "function") {
        return req.get("authorization") || req.get("Authorization");
      }
      if (req && typeof req.header === "function") {
        return req.header("authorization") || req.header("Authorization");
      }
      if (reqWrapper && reqWrapper.headers) {
        return (
          reqWrapper.headers["authorization"] ||
          reqWrapper.headers["Authorization"]
        );
      }
      if (req && req.headers) {
        return req.headers["authorization"] || req.headers["Authorization"];
      }
    } catch {
      // Silently ignore header parsing issues
    }
    return null;
  };

  const header = readAuthHeader();
  let user = null;

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
        // Invalid token -> anonymous; deliberate non-throw
      }
    }
  }

  return { req: req, rawReq: reqWrapper.raw || null, user };
};