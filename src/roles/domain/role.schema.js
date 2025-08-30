/**
 * role.schema.js
 *
 * Role model schema containing role name and base fields.
 * - name is restricted to values defined in roles.enum.js
 * - baseSchema provides createdAt, updatedAt, deletedAt plus helpers
 */

const mongoose = require("mongoose");
const RoleTypeEnum = require("../../_shared/enum/roles.enum");
const baseSchema = require("../../_shared/db/baseSchema");

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: [RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER, RoleTypeEnum.EMPLOYEE],
    required: true,
    unique: true,
  },
});

// Add base fields and helper methods
roleSchema.add(baseSchema);

module.exports = mongoose.model("Role", roleSchema);