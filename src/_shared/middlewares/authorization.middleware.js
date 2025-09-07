/**
 * @fileoverview Role-based authorization middleware.
 *
 * Responsibilities:
 *  - Load user (by id from req.user) including role population.
 *  - Enforce allowedRoles array.
 *
 * Assumptions:
 *  - authentication.middleware has already decoded JWT and set req.user (payload or userId).
 *
 * Efficiency:
 *  - One DB call per request; consider caching user.role if high traffic.
 *
 * Security:
 *  - Avoid relying solely on client-provided role claims; ensures server-trusted value.
 */
const User = require("../../modules/users/application/user.service");
const userPopulate = require("../../modules/users/domain/user.populate");

module.exports = (allowedRoles) => {
  return async (req, res, next) => {
    // NOTE: req.user may be a decoded JWT payload { userId }
    const id = req.user?.userId || req.user;
    const user = await User.findById(id, userPopulate);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.status !== 200) {
      return res.status(user.status).json({ error: user.error });
    }

    if (!allowedRoles.includes(user.data.role.name)) {
      return res
        .status(403)
        .json({ error: "Access denied, insufficient permissions" });
    }

    next();
  };
};