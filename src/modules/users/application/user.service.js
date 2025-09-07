/**
 * @fileoverview UserService: user-specific data access helpers.
 *
 * Extends:
 *  - BaseService for generic CRUD + soft delete.
 *
 * Adds:
 *  - findByEmail(email, includePassword=false)
 *
 * Security:
 *  - When includePassword=false (default) the password field is excluded.
 *  - Upstream callers must sanitize outputs (GraphQL resolvers already exclude sensitive fields).
 *
 * Future:
 *  - Add lastLogin tracking, login attempt throttling logic, etc.
 */
const BaseService = require("../../../_shared/service/base.service.js");
const User = require("../domain/user.schema.js");

class UserService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Find a user by email.
   * @param {string} email
   * @param {boolean} includePassword - Include password hash for credential validation use case.
   * @returns {{status:number,data?:any,error?:string}}
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