// Job to periodically remove expired refresh tokens.
// Comments in English as requested.

const cron = require('node-cron');
const RefreshToken = require('../../auth/domain/refresh-token.schema'); // adjust path if needed
const { logger } = require('../utils/logger'); // adjust path if needed
const config = require('../../_shared/config/config'); // your config module

/**
 * Delete expired refresh tokens in batches to avoid large single deletions.
 * @param {Object} options
 * @param {Number} options.batchSize - how many documents to delete per batch (default 1000)
 * @returns {Object} summary { deletedCount }
 */
async function cleanupExpiredRefreshTokens({ batchSize = 1000 } = {}) {
  const now = new Date();
  let totalDeleted = 0;

  try {
    // Loop and delete in batches
    while (true) {
      // Find a batch of expired documents (only _id selected)
      const docs = await RefreshToken.find({ expiresAt: { $lte: now } })
        .limit(batchSize)
        .select('_id')
        .lean();

      if (!docs || docs.length === 0) break;

      const ids = docs.map((d) => d._id);
      const res = await RefreshToken.deleteMany({ _id: { $in: ids } });
      totalDeleted += res.deletedCount || 0;

      // Small pause can be added if needed to reduce DB pressure (optional)
      // await new Promise(resolve => setTimeout(resolve, 50));
    }

    logger(`Refresh token cleanup completed, deleted ${totalDeleted} expired tokens`);
    return { deletedCount: totalDeleted };
  } catch (err) {
    logger(`Error during refresh token cleanup: ${err.message}`, 'ERROR', 'red');
    throw err;
  }
}

/**
 * Register a cron job for cleanup.
 * Read cron expression from env or config, fallback to daily at 02:00 (server local time).
 */
function registerCleanupJob() {
  const schedule = config.JOB.cleanupExpiredRefreshTokens ||
    '0 2 * * *';

  if (!cron.validate(schedule)) {
    logger(`Invalid cron schedule for refresh token cleanup: ${schedule}. Job not registered.`, 'WARN', 'yellow');
    return;
  }

  cron.schedule(
    schedule,
    () => {
      logger('Starting scheduled refresh token cleanup job');
      cleanupExpiredRefreshTokens().catch((err) =>
        logger(`Scheduled cleanup failed: ${err.message}`, 'ERROR', 'red')
      );
    },
    { scheduled: true }
  );

  logger(`Registered refresh token cleanup job with schedule "${schedule}"`);
}

module.exports = {
  registerCleanupJob,
};