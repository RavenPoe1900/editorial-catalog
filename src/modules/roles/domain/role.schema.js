/**
 * @fileoverview Role Mongoose schema.
 *
 * Responsibilities:
 *  - Persist system role names (one document per distinct role).
 *
 * Schema Notes:
 *  - "name" unique => prevents duplicates (case-sensitive uniqueness).
 *
 * Soft Delete:
 *  - Base schema adds deletedAt; logically a role can be "disabled" without removal.
 *
 * Future:
 *  - Introduce immutable flag for core roles (ADMIN, etc.).
 *  - Add description / metadata / UI labels.
 */
const mongoose = require("mongoose");
const RoleTypeEnum = require("../../../_shared/enum/roles.enum");
const baseSchema = require("../../../_shared/db/baseSchema");

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