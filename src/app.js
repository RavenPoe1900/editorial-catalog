/**
 * @fileoverview Application entry point with graceful shutdown for
 * HTTP + MongoDB + RabbitMQ + Elasticsearch. All environment access is
 * centralized via config.*
 *
 * Startup flow:
 *  1. Connect MongoDB (fail-fast)
 *  2. Initialize Express + core middlewares
 *  3. Register basic health endpoint
 *  4. Mount GraphQL
 *  5. Register global error handler
 *  6. Launch background initializers (non-blocking)
 *  7. Start HTTP server
 *
 * Graceful shutdown:
 *  - Signals: SIGINT, SIGTERM, SIGUSR2 (nodemon), unhandledRejection, uncaughtException
 *  - Order: HTTP -> RabbitMQ -> Elasticsearch -> MongoDB
 *  - Max duration configurable (config.SERVER.gracefulTimeoutMs)
 *
 * Notes:
 *  - SIGUSR2 is re-fired for nodemon restarts
 *  - Avoid calling process.exit() deep in the codebase; handle here
 */
console.log("BOOT: loading core modules...");

const http = require("http");
const express = require("express");
const MongoDb = require("./_shared/db/mongoConnect.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./_shared/config/config.js");
const { logger } = require("./_shared/utils/logger.js");
const errorHandler = require("./_shared/middlewares/errorHandle.middleware.js");

const { setupGraphQL } = require("./graphql/index");
const { ensureEmployeeRole } = require("./_shared/dataInitializer/role.dataInitializer.js");
const { ensureSearchAndBus } = require("./_shared/dataInitializer/searchAndBus.initializer");
const { registerCleanupJob } = require("./_shared/jobs/refreshTokenCleanup.job");
const { closeRabbitMQ } = require("./_shared/integrations/rabbitmq/rabbitmq");
const { closeES } = require("./_shared/integrations/elasticsearch/es.client");

const PORT = config.SERVER.port;
const GRACEFUL_TIMEOUT_MS = config.SERVER.gracefulTimeoutMs;

let serverRef = null;
let mongoDbInstance = null;
let shuttingDown = false;
let shutdownTimer = null;

async function main() {
  console.log("MAIN: starting bootstrap sequence...");

  // 1. Critical DB
  try {
    console.log("MAIN: connecting MongoDB...");
    mongoDbInstance = new MongoDb();
    await mongoDbInstance.connect();
    console.log("MAIN: MongoDB connected.");
  } catch (dbError) {
    console.error("FATAL: MongoDB connection failed.", dbError);
    process.exit(1);
  }

  // 2. Express app
  const app = express();
  console.log("MAIN: Express instance created.");

  app.use(cors({ origin: config.SERVER.corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: false }));

  // 3. Health endpoint (lightweight)
  app.get("/_health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // 4. GraphQL
  console.log("MAIN: setting up GraphQL...");
  await setupGraphQL(app);
  console.log("MAIN: GraphQL mounted.");

  // 5. Error handler
  app.use(errorHandler);
  console.log("MAIN: Global error handler registered.");

  // 6. Background initializers (non-blocking)
  ensureEmployeeRole().catch((err) =>
    console.error("Role initialization error:", err)
  );
  ensureSearchAndBus().catch((err) =>
    console.error("Search/Bus initialization error:", err)
  );
  registerCleanupJob();
  console.log("MAIN: background tasks triggered.");

  // 7. HTTP server
  serverRef = http.createServer(app);

  serverRef.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`FATAL: Port ${PORT} already in use.`);
      process.exit(1);
    } else {
      console.error("HTTP server error:", err);
    }
  });

  serverRef.listen(PORT, () => {
    console.log("=====================================================");
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`✅ Health:   http://localhost:${PORT}/_health`);
    console.log(`✅ GraphiQL: http://localhost:${PORT}/graphiql`);
    console.log("=====================================================");
    logger(`Server started in mode: ${config.SERVER.nodeEnv}`);
  });
}

/**
 * Close MongoDB connection if open.
 */
async function closeMongo() {
  if (
    mongoDbInstance?.mongoose?.connection &&
    mongoDbInstance.mongoose.connection.readyState === 1
  ) {
    try {
      await mongoDbInstance.mongoose.disconnect();
      console.log("[SHUTDOWN] MongoDB disconnected");
    } catch (err) {
      console.warn("[SHUTDOWN] MongoDB disconnect error:", err.message);
    }
  }
}

/**
 * Close HTTP server (does not force open sockets).
 */
function closeHttpServer() {
  return new Promise((resolve) => {
    if (!serverRef) return resolve();
    serverRef.close(() => {
      console.log("[SHUTDOWN] HTTP server closed");
      resolve();
    });
  });
}

/**
 * Orchestrated graceful shutdown sequence.
 */
async function shutdown(signal) {
  if (shuttingDown) {
    console.log(`[SHUTDOWN] Duplicate signal ignored: ${signal}`);
    return;
  }
  shuttingDown = true;
  console.log(`[SHUTDOWN] Signal received: ${signal}`);

  shutdownTimer = setTimeout(() => {
    console.error(
      `[SHUTDOWN] Grace period (${GRACEFUL_TIMEOUT_MS}ms) exceeded. Forcing exit.`
    );
    process.exit(1);
  }, GRACEFUL_TIMEOUT_MS).unref();

  try {
    await closeHttpServer();
    await closeRabbitMQ();
    await closeES();
    await closeMongo();
  } catch (err) {
    console.error("[SHUTDOWN] Error during shutdown:", err);
  }

  clearTimeout(shutdownTimer);
  console.log("[SHUTDOWN] Sequence complete.");

  if (signal === "SIGUSR2") {
    // nodemon restart
    process.kill(process.pid, "SIGUSR2");
  } else {
    process.exit(0);
  }
}

// System signals
["SIGINT", "SIGTERM", "SIGUSR2"].forEach((sig) => {
  process.once(sig, () => shutdown(sig));
});

// Global error traps
process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  shutdown("UNCAUGHT_EXCEPTION");
});

main();