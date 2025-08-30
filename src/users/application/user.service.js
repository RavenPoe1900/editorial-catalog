/**
 * user.service.js
 *
 * Service layer for User model. Extends a generic BaseService that provides
 * common CRUD and query helpers. This file adds user-specific helpers:
 * - findByEmail(email, includePassword=false): returns user, optionally selecting password
 *
 * Notes:
 * - By default the model queries filter out soft-deleted documents (deletedAt != null).
 * - includePassword toggles selecting the +password field (assuming password has select: false in schema).
 */

const BaseService = require("../../_shared/service/base.service.js");
const User = require("../domain/user.schema.js");

class UserService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Find a user by email.
   * @param {string} email
   * @param {boolean} includePassword - when true, select the password field for comparison
   * @returns {Promise<Document|null>} Mongoose document (or wrapper in BaseService usage)
   */
  async findByEmail(email, includePassword = false) {
    try {
      const query = this.model.findOne({ email, deletedAt: null });
      if (includePassword) query.select("+password");
      const doc = await query.exec();
      if (!doc) return { status: 404, error: "User not found" };
      return { status: 200, data: doc };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

module.exports = new UserService();