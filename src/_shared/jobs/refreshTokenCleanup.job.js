const cron = require("node-cron");
const RefreshToken = require("../../auth/domain/refresh-token.schema");
const { logger } = require("../utils/logger");
const config = require("../config/config");

/**
 * Delete expired refresh tokens in batches to avoid long-running deletions.
 * Returns a summary with deletedCount.
 */
async function cleanupExpiredRefreshTokens({ batchSize = 1000 } = {}) {
  const now = new Date();
  let totalDeleted = 0;

  try {
    while (true) {
      const docs = await RefreshToken.find({ expiresAt: { $lte: now } })
        .limit(batchSize)
        .select("_id")
        .lean();

      if (!docs || docs.length === 0) break;

      const ids = docs.map((d) => d._id);
      const res = await RefreshToken.deleteMany({ _id: { $in: ids } });
      totalDeleted += res.deletedCount || 0;
    }

    logger(
      `Refresh token cleanup completed, deleted ${totalDeleted} expired tokens`
    );
    return { deletedCount: totalDeleted };
  } catch (err) {
    logger(`Error during refresh token cleanup: ${err.message}`, "ERROR", "red");
    throw err;
  }
}

/**
 * Register a cron job to run cleanup periodically.
 * Reads schedule from config.JOB.cronCleanupRefreshTokens or defaults to 02:00 daily.
 */
function registerCleanupJob() {
  const schedule = config.JOB.cronCleanupRefreshTokens || "0 2 * * *";

  if (!cron.validate(schedule)) {
    logger(
      `Invalid cron schedule for refresh token cleanup: ${schedule}. Job not registered.`,
      "WARN",
      "yellow"
    );
    return;
  }

  cron.schedule(
    schedule,
    () => {
      logger("Starting scheduled refresh token cleanup job");
      cleanupExpiredRefreshTokens().catch((err) =>
        logger(`Scheduled cleanup failed: ${err.message}`, "ERROR", "red")
      );
    },
    { scheduled: true }
  );

  logger(`Registered refresh token cleanup job with schedule "${schedule}"`);
}

module.exports = {
  registerCleanupJob,
};