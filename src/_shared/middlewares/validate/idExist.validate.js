/**
 * @fileoverview Factory for async existence validation inside Joi schemas.
 *
 * Usage (Joi .external()):
 *  role: Joi.string().external(validateIdExistence(RoleService, 'Role not found'))
 *
 * Behavior:
 *  - Calls modelService.findById(value).
 *  - If not found or error -> returns helpers.message(message).
 *
 * Reliability:
 *  - Silent catch logs suppressed; returns message on exceptions (safe fallback).
 */
module.exports = (modelService, message) => {
  return async (value, helpers) => {
    try {
      if (!value) return true;
      const res = await modelService.findById(value);
      if (!res || res.status !== 200 || !res.data) {
        return helpers.message(message);
      }
      return true;
    } catch (error) {
      console.error("idExist.validate error:", error);
      return helpers.message(message);
    }
  };
};