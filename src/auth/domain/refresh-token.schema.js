/**
 * @fileoverview RefreshToken persistence schema.
 *
 * Responsibilities:
 *  - Persist refresh token instances via unique jti.
 *  - Track expiration (expiresAt) and revocation (revokedAt).
 *  - Associate token with userId for ownership and rotation logic.
 *
 * TTL Behavior:
 *  - Index on expiresAt with expireAfterSeconds:0 will allow MongoDB to
 *    remove expired documents automatically (background TTL monitor).
 *
 * Security:
 *  - Tokens are invalid after revocation OR expiration.
 *  - Does not store the raw token string (only JTI); token secrecy resides client-side.
 *
 * Future:
 *  - Add user-agent / device fingerprint fields for session management UI.
 *  - Add createdAt for audit (timestamps currently disabled).
 */
const mongoose = require("mongoose");
const baseSchema = require("../../../src/_shared/db/baseSchema");

const refreshTokensSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: false }
);

refreshTokensSchema.index({ userId: 1 });
refreshTokensSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokensSchema.add(baseSchema);

module.exports =
  mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", refreshTokensSchema);