const amqplib = require("amqplib");
const { logger } = require("../../utils/logger");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE = process.env.RABBITMQ_EXCHANGE || "products.events";

let connection = null;
let channel = null;
let connecting = null;

async function connect() {
  if (channel) return channel;
  if (connecting) return connecting;

  connecting = (async () => {
    const conn = await amqplib.connect(RABBITMQ_URL);
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

    await ch.assertExchange(EXCHANGE, "topic", { durable: true });

    connection = conn;
    channel = ch;

    logger(`[RabbitMQ] connected and exchange "${EXCHANGE}" asserted`, "INFO:", "green");
    return channel;
  })();

  return connecting;
}

/**
 * Retry connect and throw if it cannot connect after N attempts.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForRabbitMQ(options = {}) {
  const retries = Number(options.retries ?? process.env.STARTUP_RETRIES_RABBIT ?? 10);
  const delayMs = Number(options.delayMs ?? process.env.STARTUP_RETRY_DELAY_MS ?? 2000);

  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await connect();
      logger(`[RabbitMQ] connectivity OK on attempt ${attempt}/${retries}`, "INFO:", "green");
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
    `RabbitMQ not available after ${retries} attempts at ${RABBITMQ_URL}: ${lastErr?.message || "unknown error"}`
  );
  error.cause = lastErr;
  throw error;
}

/**
 * Publish a domain event to topic exchange (best-effort).
 */
async function publish(routingKey, payload, headers = {}) {
  try {
    const ch = await connect();
    const content = Buffer.from(JSON.stringify(payload));
    await new Promise((resolve, reject) => {
      ch.publish(
        EXCHANGE,
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
    logger(`[RabbitMQ] publish failed (${routingKey}): ${err?.message}`, "WARN:", "yellow");
    return false;
  }
}

module.exports = {
  connect,
  waitForRabbitMQ,
  publish,
};