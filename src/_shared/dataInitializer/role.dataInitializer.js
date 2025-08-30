const RoleService = require("../../roles/application/role.service");
const RoleTypeEnum = require("../enum/roles.enum");

async function ensureEmployeeRole() {
  try {
    const roles = await RoleService.findOneByCriteria({
      name: RoleTypeEnum.EMPLOYEE,
    });
    if (roles.status !== 200) {
      await RoleService.create({ name: RoleTypeEnum.EMPLOYEE });
    }
  } catch (error) {
    console.error('Error ensuring "EMPLOYEE" role:', error);
    throw error; // Propagate the error to handle it in the main application
  }
}

module.exports = { ensureEmployeeRole };
