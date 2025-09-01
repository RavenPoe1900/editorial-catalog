const mongoose = require("mongoose");
const RoleTypeEnum = require("../../../_shared/enum/roles.enum");
const baseSchema = require("../../../_shared/db/baseSchema");

/**
 * Role schema.
 * - Uses the shared RoleTypeEnum (lower-case values) as the single source of truth.
 * - Includes base fields (createdAt, updatedAt, deletedAt).
 */
const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: {
      values: Object.values(RoleTypeEnum),
      message: "Invalid role type",
    },
    required: true,
    unique: true,
  },
});

roleSchema.add(baseSchema);

module.exports = mongoose.model("Role", roleSchema);