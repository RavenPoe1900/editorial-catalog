/**
 * @fileoverview Data initializer to ensure baseline Role documents exist.
 *
 * Responsibilities:
 *  - Guarantee critical baseline roles are present at startup (idempotent).
 *  - Avoid duplicate creation if roles already exist.
 *
 * Behavior:
 *  - For each role in rolesToEnsure:
 *      - Attempts a findOneByCriteria({ name })
 *      - If not found (status != 200) creates it.
 *
 * Reliability:
 *  - Best-effort; if a creation fails (e.g. transient DB outage) the app still runs,
 *    though downstream logic depending on role presence may fail. Consider fail-fast if strict.
 *
 * Concurrency:
 *  - If multiple app instances run this simultaneously, unique index on role name prevents duplicates.
 *
 * Future:
 *  - Return a summary of created / existing roles for logging or metrics.
 *  - Add retries or wrap in a transaction if extended with more operations.
 */
const RoleService = require("../../modules/roles/application/role.service");
const RoleTypeEnum = require("../enum/roles.enum");

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
    throw error; // escalate so caller may decide to fail fast or ignore
  }
}

module.exports = { ensureEmployeeRole };