/**
 * @fileoverview RoleService: specialized CRUD facade for Role model.
 *
 * Responsibilities:
 *  - Extend BaseService for Role-specific future behaviors (permission policies, caching).
 *  - Provide a centralized place to evolve role logic without touching generic BaseService.
 *
 * Current State:
 *  - No custom methods yet; inherits all CRUD from BaseService.
 *
 * Future Enhancements:
 *  - addPermissions(roleId, permissions[])
 *  - cache role lookups with TTL
 *  - map external IAM groups to internal roles
 */
const BaseService = require("../../../_shared/service/base.service.js");
const Role = require("../domain/role.schema.js");

class RoleService extends BaseService {
  constructor() {
    super(Role);
  }

  // Placeholder for role-specific methods later.
}

module.exports = new RoleService();