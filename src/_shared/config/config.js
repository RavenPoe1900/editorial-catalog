/**
 * @fileoverview Central configuration aggregator.
 *
 * Single source of truth for environment variable access. All other modules
 * must import from here instead of reading process.env directly.
 *
 * Groups:
 *  - SERVER: runtime and startup parameters
 *  - JWT / REFRESH_JWT: access and refresh token settings
 *  - COOKIE: cookie options (e.g. potential refresh cookie)
 *  - MONGODB: database connection URIs
 *  - JOB: cron / scheduled job settings
 *  - SEARCH: Elasticsearch connection + retry policy
 *  - RABBIT: RabbitMQ connection + retry policy
 *
 * Security:
 *  - Do NOT log secrets or the entire config object in production.
 *  - Default fallback keys must be overridden in real environments.
 *
 * Future:
 *  - Add schema validation with Joi/Zod and fail-fast on invalid/missing values.
 *  - Load environment-specific .env files (.env.production, etc.).
 */
const dotenv = require("dotenv");
dotenv.config();

const SERVER = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || true,
  gracefulTimeoutMs: Number(process.env.GRACEFUL_TIMEOUT_MS || 10000),
};

const JWT = {
  key: process.env.JWT_SECRET_KEY || "your-secret-key",
  expires: process.env.JWT_SECRET_KEY_EXPIRES || "15m",
};

const REFRESH_JWT = {
  refreshKey: process.env.JWT_REFRESH_KEY || "your-refresh-secret-key",
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  maxTokensPerUser: parseInt(process.env.REFRESH_MAX_TOKENS || "5", 10),
};

const COOKIE = {
  secure: process.env.COOKIE_SECURE === "true" || false,
  httpOnly: true,
  sameSite: process.env.COOKIE_SAMESITE || "Lax",
  maxAge: process.env.COOKIE_MAXAGE ? parseInt(process.env.COOKIE_MAXAGE, 10) : null,
};

const MONGODB = {
  url: process.env.MONGO_URI,
  urlIntegration: process.env.MONGO_URI_INTEGRATION,
};

const JOB = {
  cronCleanupRefreshTokens: process.env.CRON_CLEANUP_REFRESH_TOKENS,
};

const SEARCH = {
  url: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
  productIndex: process.env.ELASTICSEARCH_PRODUCT_INDEX || "products",
  startupRetries: Number(process.env.STARTUP_RETRIES_SEARCH || 10),
  startupDelayMs: Number(process.env.STARTUP_RETRY_DELAY_MS || 2000),
};

const RABBIT = {
  url: process.env.RABBITMQ_URL || "amqp://localhost",
  exchange: process.env.RABBITMQ_EXCHANGE || "products.events",
  startupRetries: Number(process.env.STARTUP_RETRIES_RABBIT || 10),
  startupDelayMs: Number(process.env.STARTUP_RETRY_DELAY_MS || 2000),
};

module.exports = {
  PORT: SERVER.port,
  NODE_ENV: SERVER.nodeEnv,
  URL: "/api",
  SERVER,
  JWT,
  REFRESH_JWT,
  COOKIE,
  MONGODB,
  JOB,
  SEARCH,
  RABBIT,
};