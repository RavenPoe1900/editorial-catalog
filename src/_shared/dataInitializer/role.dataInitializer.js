const RoleService = require("../../modules/roles/application/role.service");
const RoleTypeEnum = require("../enum/roles.enum");

/**
 * Ensure baseline roles exist in DB.
 * This initializer is idempotent and safe to call at startup.
 */
async function ensureEmployeeRole() {
  try {
    const rolesToEnsure = [
      RoleTypeEnum.EMPLOYEE,
      RoleTypeEnum.PROVIDER,
      RoleTypeEnum.EDITOR,
    ];
    for (const roleName of rolesToEnsure) {
      const res = await RoleService.findOneByCriteria({ name: roleName });
      if (!res || res.status !== 200) {
        await RoleService.create({ name: roleName });
      }
    }
  } catch (error) {
    console.error("Error ensuring roles:", error);
    throw error;
  }
}

module.exports = { ensureEmployeeRole };