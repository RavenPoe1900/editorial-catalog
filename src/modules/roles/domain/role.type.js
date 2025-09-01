/**
 * Enumeración de roles de usuario en el sistema
 * @readonly
 * @enum {string}
 */
const RoleType = Object.freeze({
  /** Administrador del sistema */
  ADMIN: "ADMIN",
  /** Gerente con permisos amplios */
  MANAGER: "MANAGER",
  /** Empleado con permisos básicos */
  EMPLOYEE: "EMPLOYEE",
  /** Proveedor que puede crear productos */
  PROVIDER: "PROVIDER",
  /** Editor que puede revisar y aprobar productos */
  EDITOR: "EDITOR"
});

module.exports = RoleType;