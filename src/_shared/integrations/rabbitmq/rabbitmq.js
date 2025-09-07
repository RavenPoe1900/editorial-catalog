/**
 * @fileoverview RabbitMQ connection + publisher utilities with graceful close.
 *
 * Features:
 *  - connect(): lazy singleton connection + confirm channel
 *  - publish(): confirm-based publishing (returns boolean)
 *  - waitForRabbitMQ(): retry loop for startup readiness
 *  - closeRabbitMQ(): idempotent resource teardown
 *
 * Design:
 *  - Single confirm channel reused (adequate for moderate throughput)
 *  - Durable topic exchange asserted
 *
 * Limitations:
 *  - No outbox pattern → a DB commit followed by a publish failure loses the event
 *    (add outbox + worker for stronger guarantees if needed)
 */
const amqplib = require("amqplib");
const { logger } = require("../../utils/logger");
const config = require("../../config/config");

let connection = null;
let channel = null;
let connecting = null;

async function connect() {
  if (channel) return channel;
  if (connecting) return connecting;

  connecting = (async () => {
    const conn = await amqplib.connect(config.RABBIT.url);

    conn.on("close", () => {
      channel = null;
      connection = null;
      connecting = null;
      logger("[RabbitMQ] connection closed", "WARN:", "yellow");
    });

    conn.on("error", (err) => {
      logger(`[RabbitMQ] connection error: ${err?.message}`, "ERROR:", "red");
    });

    const ch = await conn.createConfirmChannel();
    ch.on("error", (err) => {
      logger(`[RabbitMQ] channel error: ${err?.message}`, "ERROR:", "red");
    });

    await ch.assertExchange(config.RABBIT.exchange, "topic", { durable: true });

    connection = conn;
    channel = ch;

    logger(
      `[RabbitMQ] connected and exchange "${config.RABBIT.exchange}" asserted`,
      "INFO:",
      "green"
    );
    return channel;
  })();

  return connecting;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForRabbitMQ(options = {}) {
  const retries = Number(options.retries ?? config.RABBIT.startupRetries);
  const delayMs = Number(options.delayMs ?? config.RABBIT.startupDelayMs);

  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await connect();
      logger(
        `[RabbitMQ] connectivity OK attempt ${attempt}/${retries}`,
        "INFO:",
        "green"
      );
      return true;
    } catch (err) {
      lastErr = err;
      logger(
        `[RabbitMQ] connect failed (attempt ${attempt}/${retries}): ${err?.message}`,
        attempt < retries ? "WARN:" : "ERROR:",
        attempt < retries ? "yellow" : "red"
      );
      if (attempt < retries) await sleep(delayMs);
    }
  }
  const error = new Error(
    `RabbitMQ unavailable after ${retries} attempts at ${config.RABBIT.url}: ${
      lastErr?.message || "unknown error"
    }`
  );
  error.cause = lastErr;
  throw error;
}

async function publish(routingKey, payload, headers = {}) {
  try {
    const ch = await connect();
    const content = Buffer.from(JSON.stringify(payload));
    await new Promise((resolve, reject) => {
      ch.publish(
        config.RABBIT.exchange,
        routingKey,
        content,
        {
          contentType: "application/json",
          persistent: true,
          headers,
        },
        (err, ok) => (err ? reject(err) : resolve(ok))
      );
    });
    logger(`[RabbitMQ] published ${routingKey}`, "INFO:", "green");
    return true;
  } catch (err) {
    logger(
      `[RabbitMQ] publish failed (${routingKey}): ${err?.message}`,
      "WARN:",
      "yellow"
    );
    return false;
  }
}

async function closeRabbitMQ() {
  try {
    if (channel) {
      try {
        await channel.close();
        logger("[RabbitMQ] channel closed", "INFO:", "green");
      } catch (err) {
        logger(`[RabbitMQ] channel close error: ${err?.message}`, "WARN:", "yellow");
      } finally {
        channel = null;
      }
    }
    if (connection) {
      try {
        await connection.close();
        logger("[RabbitMQ] connection closed", "INFO:", "green");
      } catch (err) {
        logger(
          `[RabbitMQ] connection close error: ${err?.message}`,
          "WARN:",
          "yellow"
        );
      } finally {
        connection = null;
      }
    }
  } catch (e) {
    logger(`[RabbitMQ] unexpected close error: ${e?.message}`, "WARN:", "yellow");
  }
}

module.exports = {
  connect,
  waitForRabbitMQ,
  publish,
  closeRabbitMQ,
};