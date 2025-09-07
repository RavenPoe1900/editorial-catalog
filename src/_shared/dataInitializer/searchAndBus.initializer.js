/**
 * @fileoverview Startup initializer for search (Elasticsearch) and message bus (RabbitMQ).
 *
 * Modes:
 *  - ensureSearchAndBusOrFail(): fail-fast if dependencies unavailable (strict readiness).
 *  - ensureSearchAndBus(): best-effort, logs warnings but does not throw (developer-friendly).
 *
 * Behavior:
 *  - For ES: ping + optional index ensure.
 *  - For RabbitMQ: single or minimal retries (configurable via env).
 *
 * Future:
 *  - Add metrics for dependency readiness timing.
 *  - Add circuit breaker for repeated mid-runtime failures.
 */
const { ensureESConnectivity, pingES } = require("../integrations/elasticsearch/es.client");
const { ensureProductIndex } = require("../integrations/elasticsearch/es.product.indexer");
const { waitForRabbitMQ } = require("../integrations/rabbitmq/rabbitmq");
const { logger } = require("../utils/logger");

async function ensureSearchAndBusOrFail() {
  logger("[Startup] Checking Elasticsearch connectivity...", "INFO:", "green");
  await ensureESConnectivity();

  logger("[Startup] Ensuring Elasticsearch product index...", "INFO:", "green");
  await ensureProductIndex();

  logger("[Startup] Checking RabbitMQ connectivity...", "INFO:", "green");
  await waitForRabbitMQ();

  logger("[Startup] Search and Bus ready", "INFO:", "green");
}

async function ensureSearchAndBus() {
  let okES = false;

  try {
    okES = await pingES();
    if (!okES) {
      logger("[Startup] ES not reachable; skipping index ensure", "WARN:", "yellow");
    } else {
      try {
        await ensureProductIndex();
      } catch (err) {
        logger(
          `[Startup] Ensure ES index failed (non-fatal): ${err?.message}`,
          "WARN:",
          "yellow"
        );
      }
    }
  } catch (err) {
    logger(
      `[Startup] ES ping error (non-fatal): ${err?.message}`,
      "WARN:",
      "yellow"
    );
  }

  try {
    await waitForRabbitMQ({ retries: 1, delayMs: 500 });
  } catch (err) {
    logger(
      `[Startup] RabbitMQ connect failed (non-fatal): ${err?.message}`,
      "WARN:",
      "yellow"
    );
  }

  logger("[Startup] Search and Bus attempted (best-effort)", "INFO:", "green");
  return okES;
}

module.exports = { ensureSearchAndBusOrFail, ensureSearchAndBus };