/**
 * @fileoverview Middleware to sanitize request objects for Mongo operator injection.
 *
 * Uses:
 *  - mongo-sanitize to strip keys beginning with $ or containing dots that could produce operator injection.
 *
 * Security:
 *  - Protects naive query builders from $ne / $gt style injection via body / params / query.
 *
 * Performance:
 *  - Shallow scan acceptable; for very large bodies consider selective sanitation.
 */
const mongoSanitize = require("mongo-sanitize");

module.exports = (req, _res, next) => {
  req.body = mongoSanitize(req.body);
  req.query = mongoSanitize(req.query);
  req.params = mongoSanitize(req.params);
  next();
};