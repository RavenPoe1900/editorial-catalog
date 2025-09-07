/**
 * @fileoverview User Mongoose schema.
 *
 * Fields:
 *  - email unique (login identifier)
 *  - role (ObjectId -> Role)
 *  - refreshTokens: array of RefreshToken ObjectIds (optional ref usage)
 *
 * Security:
 *  - password stored as hash (bcrypt) - ensure never selected by default in production (could add select:false).
 *
 * Soft Delete:
 *  - Via baseSchema (deletedAt). Deleted users excluded in service queries.
 *
 * Future:
 *  - Add index on lowercased email for case-insensitive login.
 *  - Add password rotation metadata (lastPasswordChange).
 */
const mongoose = require("mongoose");
const baseSchema = require("../../../_shared/db/baseSchema");

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true }, // Consider select:false in production
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  lastUsedRole: { type: mongoose.Schema.Types.ObjectId, ref: "Role", default: null },
  refreshTokens: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefreshToken",
    },
  ],
});

userSchema.add(baseSchema);

module.exports = mongoose.model("User", userSchema);