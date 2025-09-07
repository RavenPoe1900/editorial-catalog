/**
 * @fileoverview Role name enumeration (lowercase variant).
 *
 * NOTE:
 *  - There is another enum definition (role.type.js / role.enum.js) using uppercase values.
 *  - This duplication may cause confusion in code paths expecting specific casing.
 *
 * Recommendation:
 *  - Consolidate role enum usage into a single source of truth.
 *  - Normalize comparisons to lowercase or uppercase consistently across system.
 */
const RoleTypeEnum = {
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
  PROVIDER: "provider",
  EDITOR: "editor",
};

module.exports = RoleTypeEnum;