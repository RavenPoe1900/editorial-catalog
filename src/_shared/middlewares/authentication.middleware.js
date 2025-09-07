/**
 * @fileoverview Access token verification (Express middleware).
 *
 * Responsibilities:
 *  - Parse Authorization header (Bearer or raw token).
 *  - Verify JWT using configured signing key.
 *  - Attach decoded payload to req.user for downstream handlers.
 *
 * Failure Mode:
 *  - Responds 401 on any verification failure (invalid signature, expired, malformed).
 *
 * SECURITY:
 *  - Does not perform role-based authorization (handled separately).
 *  - Ensure upstream reverse proxy strips conflicting Authorization headers.
 *
 * PERFORMANCE:
 *  - Stateless verification; no DB lookups. Suitable for horizontal scaling.
 */
const jwt = require("jsonwebtoken");
const config = require("../config/config");

module.exports = (req, res, next) => {
  const header = req.header("Authorization");

  if (!header) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  // Supports both "Bearer <token>" and "<token>"
  const token = header.startsWith("Bearer ") ? header.substring(7) : header;

  if (!token) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT.key);
    req.user = decoded; // Downstream controllers expect { userId, role? }
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ error: "Token is not valid" });
  }
};