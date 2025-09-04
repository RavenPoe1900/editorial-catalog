const { ensureESConnectivity, pingES } = require("../integrations/elasticsearch/es.client");
const { ensureProductIndex } = require("../integrations/elasticsearch/es.product.indexer");
const { waitForRabbitMQ } = require("../integrations/rabbitmq/rabbitmq");
const { logger } = require("../utils/logger");

/**
 * Fail-fast: asegura conectividad a ES y RabbitMQ y lanza si falla.
 * - Reintentos controlados por STARTUP_RETRIES_SEARCH, STARTUP_RETRIES_RABBIT y STARTUP_RETRY_DELAY_MS
 */
async function ensureSearchAndBusOrFail() {
  logger("[Startup] Checking Elasticsearch connectivity...", "INFO:", "green");
  await ensureESConnectivity(); // throws si falla

  logger("[Startup] Ensuring Elasticsearch product index...", "INFO:", "green");
  await ensureProductIndex(); // throws si falla

  logger("[Startup] Checking RabbitMQ connectivity...", "INFO:", "green");
  await waitForRabbitMQ(); // throws si falla

  logger("[Startup] Search and Bus ready", "INFO:", "green");
}

/**
 * Best-effort (compat): intenta preparar ES y RabbitMQ sin bloquear el arranque.
 * - Dev útil si no quieres caer el proceso cuando faltan dependencias.
 * - Devuelve true/false según disponibilidad de ES; loguea warnings en fallos.
 */
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
        logger(`[Startup] Ensure ES index failed (non-fatal): ${err?.message}`, "WARN:", "yellow");
      }
    }
  } catch (err) {
    logger(`[Startup] ES ping error (non-fatal): ${err?.message}`, "WARN:", "yellow");
  }

  try {
    // Un intento rápido de conexión (no bloquear arranque)
    await waitForRabbitMQ({ retries: 1, delayMs: 500 });
  } catch (err) {
    logger(`[Startup] RabbitMQ connect failed (non-fatal): ${err?.message}`, "WARN:", "yellow");
  }

  logger("[Startup] Search and Bus attempted (best-effort)", "INFO:", "green");
  return okES;
}

module.exports = { ensureSearchAndBusOrFail, ensureSearchAndBus };