/**
 * @fileoverview Alternate uppercase role enumeration (potential duplication).
 *
 * WARNING:
 *  - Having both lowercase and uppercase role enums risks mismatches and logic bugs.
 *  - Audit code base for places relying on one variant vs the other.
 *
 * Suggestion:
 *  - Standardize on ONE representation internally (e.g., store lowercase in DB, map to uppercase in API).
 */
const RoleType = Object.freeze({
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
  PROVIDER: "PROVIDER",
  EDITOR: "EDITOR",
});

module.exports = RoleType;