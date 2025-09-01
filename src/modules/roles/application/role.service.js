/**
 * role.service.js
 *
 * Role-specific service that extends BaseService to provide CRUD for Role model.
 * - No additional methods needed beyond generic BaseService for now.
 * - Keeps a single place to add role-related logic in future (permissions, caching, etc.)
 */

const BaseService = require("../../../_shared/service/base.service.js");
const Role = require("../domain/role.schema.js");

class RoleService extends BaseService {
  constructor() {
    super(Role);
  }

  // Add role-specific methods here (if needed)
}

module.exports = new RoleService();