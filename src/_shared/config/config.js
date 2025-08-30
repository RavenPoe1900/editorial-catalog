/**
 * config.js
 *
 * Centralized configuration loaded from environment variables.
 * - Provides settings for access JWT, refresh JWT, cookie options and MongoDB.
 * - Keep secrets in environment variables for production.
 *
 * Notes:
 * - REFRESH_JWT.refreshExpires and JWT.expires should be valid values accepted by jsonwebtoken
 *   (e.g. "15m", "7d", "12h").
 * - REFRESH_JWT.maxTokensPerUser controls how many refresh tokens are kept per user.
 */

const dotenv = require("dotenv");
dotenv.config();

const PORT = process.env.PORT || 3000;

// Access token configuration (short lived)
const JWT = {
  key: process.env.JWT_SECRET_KEY || "your-secret-key",
  expires: process.env.JWT_SECRET_KEY_EXPIRES || "15m",
};

// Refresh token configuration (longer lived)
const REFRESH_JWT = {
  refreshKey: process.env.JWT_REFRESH_KEY || "your-refresh-secret-key",
  // Accepts values like "7d", "30d", "12h"
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  // Maximum allowed active refresh tokens per user. Older tokens are pruned.
  maxTokensPerUser: parseInt(process.env.REFRESH_MAX_TOKENS || "5", 10),
};

// Cookie options if you decide to set refresh tokens as HttpOnly cookies
const COOKIE = {
  secure: process.env.COOKIE_SECURE === "true" || false, // set true in production (requires HTTPS)
  httpOnly: true, // prevents access from JavaScript
  sameSite: process.env.COOKIE_SAMESITE || "Lax",
  // maxAge in ms (optional). If not set, we set cookie expiry from token exp when available.
  maxAge: process.env.COOKIE_MAXAGE ? parseInt(process.env.COOKIE_MAXAGE, 10) : null,
};

const MONGODB = {
  url: process.env.MONGO_URI,
  urlIntegration: process.env.MONGO_URI_INTEGRATION,
};

const JOB ={
    cronCleanupRefreshTokens:process.env.CRON_CLEANUP_REFRESH_TOKENS
}

module.exports = {
  PORT,
  JWT,
  REFRESH_JWT,
  COOKIE,
  URL: "/api",
  NODE_ENV: process.env.NODE_ENV,
  MONGODB,
  JOB
};