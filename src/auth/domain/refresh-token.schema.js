const mongoose = require("mongoose");
const baseSchema = require("../../_shared/db/baseSchema");


const refreshTokensSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: false });

refreshTokensSchema.index({ userId: 1 });
refreshTokensSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokensSchema.add(baseSchema);

module.exports = mongoose.models.RefreshToken || mongoose.model("RefreshToken", refreshTokensSchema);