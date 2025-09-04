const { Client } = require("@elastic/elasticsearch");
const { logger } = require("../../utils/logger");

const ELASTIC_URL = process.env.ELASTICSEARCH_URL || "http://localhost:9200";

let client;

function getES() {
  if (!client) {
    client = new Client({ node: ELASTIC_URL });
  }
  return client;
}

async function pingES() {
  try {
    const es = getES();
    await es.ping();
    logger(`[Elasticsearch] connected at ${ELASTIC_URL}`, "INFO:", "green");
    return true;
  } catch (err) {
    logger(`[Elasticsearch] ping failed: ${err?.message}`, "WARN:", "yellow");
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ensures Elasticsearch is reachable, retrying N times.
 * Throws if still unavailable.
 */
async function ensureESConnectivity(options = {}) {
  const retries = Number(options.retries ?? process.env.STARTUP_RETRIES_SEARCH ?? 10);
  const delayMs = Number(options.delayMs ?? process.env.STARTUP_RETRY_DELAY_MS ?? 2000);

  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const es = getES();
      await es.ping();
      logger(`[Elasticsearch] connectivity OK on attempt ${attempt}/${retries}`, "INFO:", "green");
      return true;
    } catch (err) {
      lastErr = err;
      logger(
        `[Elasticsearch] ping failed (attempt ${attempt}/${retries}): ${err?.message}`,
        attempt < retries ? "WARN:" : "ERROR:",
        attempt < retries ? "yellow" : "red"
      );
      if (attempt < retries) {
        await sleep(delayMs);
      }
    }
  }
  const error = new Error(
    `Elasticsearch not available after ${retries} attempts at ${ELASTIC_URL}: ${lastErr?.message || "unknown error"}`
  );
  error.cause = lastErr;
  throw error;
}

module.exports = { getES, pingES, ensureESConnectivity };