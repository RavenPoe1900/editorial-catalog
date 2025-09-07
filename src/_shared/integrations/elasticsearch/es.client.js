/**
 * @fileoverview Elasticsearch client singleton + connectivity helpers + graceful close.
 *
 * Pattern:
 *  - getES(): lazy singleton
 *  - pingES(): lightweight health check
 *  - ensureESConnectivity(): retry loop for startup readiness
 *  - closeES(): release client (connection pool)
 *
 * Limitations:
 *  - No automatic retry for failed indexing operations (best effort).
 *  - For stronger guarantees: implement outbox + async worker ingestion.
 */
const { Client } = require("@elastic/elasticsearch");
const { logger } = require("../../utils/logger");
const config = require("../../config/config");

let client;

function getES() {
  if (!client) {
    client = new Client({ node: config.SEARCH.url });
  }
  return client;
}

async function pingES() {
  try {
    const es = getES();
    await es.ping();
    logger(`[Elasticsearch] connected at ${config.SEARCH.url}`, "INFO:", "green");
    return true;
  } catch (err) {
    logger(`[Elasticsearch] ping failed: ${err?.message}`, "WARN:", "yellow");
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureESConnectivity(options = {}) {
  const retries = Number(options.retries ?? config.SEARCH.startupRetries);
  const delayMs = Number(options.delayMs ?? config.SEARCH.startupDelayMs);

  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const es = getES();
      await es.ping();
      logger(
        `[Elasticsearch] connectivity OK attempt ${attempt}/${retries}`,
        "INFO:",
        "green"
      );
      return true;
    } catch (err) {
      lastErr = err;
      logger(
        `[Elasticsearch] ping failed (attempt ${attempt}/${retries}): ${err?.message}`,
        attempt < retries ? "WARN:" : "ERROR:",
        attempt < retries ? "yellow" : "red"
      );
      if (attempt < retries) await sleep(delayMs);
    }
  }
  const error = new Error(
    `Elasticsearch unavailable after ${retries} attempts at ${config.SEARCH.url}: ${
      lastErr?.message || "unknown error"
    }`
  );
  error.cause = lastErr;
  throw error;
}

async function closeES() {
  if (client) {
    try {
      await client.close();
      logger("[Elasticsearch] client closed", "INFO:", "green");
    } catch (err) {
      logger(`[Elasticsearch] client close error: ${err?.message}`, "WARN:", "yellow");
    } finally {
      client = null;
    }
  }
}

module.exports = { getES, pingES, ensureESConnectivity, closeES };