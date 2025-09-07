/**
 * @fileoverview Scheduled job to purge expired refresh tokens.
 *
 * Strategy:
 *  - Batch deletes (default 1000 per loop) to avoid large single ops.
 *  - Continues looping until no more expired tokens found at execution time.
 *
 * Efficiency:
 *  - Uses simple find + deleteMany. For very large sets, consider using deleteMany with a range query directly
 *    and rely on Mongo's TTL index instead (which already exists if using expiresAt index).
 *
 * Safety:
 *  - Only removes tokens where expiresAt <= now.
 *  - Ignores revokedAt separation; expired tokens are cleared regardless of revocation state.
 *
 * Cron:
 *  - Schedule read from config.JOB.cronCleanupRefreshTokens (default 02:00 daily).
 *
 * Future:
 *  - Track metrics (#deleted, duration).
 *  - Add dry-run mode for debugging.
 */
const cron = require("node-cron");
const RefreshToken = require("../../auth/domain/refresh-token.schema");
const { logger } = require("../utils/logger");
const config = require("../config/config");

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