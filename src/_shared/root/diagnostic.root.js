/**
 * @fileoverview Diagnostics / dependency health routes.
 *
 * Endpoints:
 *  - GET  /health/elasticsearch             : simple ES ping
 *  - GET  /health/elasticsearch/index       : ensure product index
 *  - GET  /health/rabbitmq                  : RabbitMQ connectivity test
 *  - POST /diagnostics/rabbitmq/publish     : publish test message
 *  - POST /diagnostics/elasticsearch/upsert : upsert test doc into ES
 *
 * Security:
 *  - Should be protected or disabled in production (reveals infrastructure status).
 *
 * Future:
 *  - Add combined readiness endpoint.
 *  - Include metrics (latency, queue depth).
 */
const express = require("express");
const { logger } = require("../utils/logger");
const { pingES } = require("../integrations/elasticsearch/es.client");
const {
  ensureProductIndex,
  upsertProduct,
} = require("../integrations/elasticsearch/es.product.indexer");
const {
  connect: rabbitConnect,
  publish: rabbitPublish,
} = require("../integrations/rabbitmq/rabbitmq");
const config = require("../config/config");

function registerDiagnosticsRoutes(app) {
  const router = express.Router();

  router.get("/health/elasticsearch", async (_req, res) => {
    try {
      const ok = await pingES();
      if (ok) {
        logger("[Diagnostics] Elasticsearch ping OK", "INFO:", "green");
        return res.status(200).json({ ok: true, url: config.SEARCH.url });
      }
      logger("[Diagnostics] Elasticsearch ping FAILED", "WARN:", "yellow");
      return res.status(503).json({ ok: false, url: config.SEARCH.url });
    } catch (err) {
      logger(
        `[Diagnostics] Elasticsearch ping error: ${err?.message}`,
        "ERROR:",
        "red"
      );
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  router.get("/health/elasticsearch/index", async (_req, res) => {
    try {
      await ensureProductIndex();
      logger(
        "[Diagnostics] Elasticsearch product index ensured",
        "INFO:",
        "green"
      );
      return res
        .status(200)
        .json({ ok: true, index: config.SEARCH.productIndex });
    } catch (err) {
      logger(
        `[Diagnostics] ensure index error: ${err?.message}`,
        "ERROR:",
        "red"
      );
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  router.get("/health/rabbitmq", async (_req, res) => {
    try {
      await rabbitConnect();
      logger("[Diagnostics] RabbitMQ channel OK", "INFO:", "green");
      return res.status(200).json({
        ok: true,
        url: config.RABBIT.url,
        exchange: config.RABBIT.exchange,
      });
    } catch (err) {
      logger(
        `[Diagnostics] RabbitMQ connect error: ${err?.message}`,
        "ERROR:",
        "red"
      );
      return res.status(503).json({ ok: false, error: err?.message });
    }
  });

  router.post("/diagnostics/rabbitmq/publish", async (req, res) => {
    try {
      const routingKey = req.body?.routingKey || "diagnostics.ping";
      const headers = req.body?.headers || {};
      const payload = {
        ...(req.body?.payload || {}),
        ts: new Date().toISOString(),
        node: process.pid,
      };
      const ok = await rabbitPublish(routingKey, payload, headers);
      const status = ok ? 200 : 500;
      logger(
        `[Diagnostics] RabbitMQ publish "${routingKey}" -> ${
          ok ? "OK" : "FAILED"
        }`,
        ok ? "INFO:" : "WARN:",
        ok ? "green" : "yellow"
      );
      return res
        .status(status)
        .json({ ok, routingKey, exchange: config.RABBIT.exchange });
    } catch (err) {
      logger(
        `[Diagnostics] RabbitMQ publish error: ${err?.message}`,
        "ERROR:",
        "red"
      );
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  router.post("/diagnostics/elasticsearch/upsert", async (req, res) => {
    try {
      const { id, doc } = req.body || {};
      if (!id || !doc) {
        return res
          .status(400)
          .json({ ok: false, error: "id and doc are required" });
      }
      await upsertProduct({ _id: id, ...doc });
      logger(
        `[Diagnostics] Elasticsearch upsert id=${id} OK`,
        "INFO:",
        "green"
      );
      return res
        .status(200)
        .json({ ok: true, id, index: config.SEARCH.productIndex });
    } catch (err) {
      logger(
        `[Diagnostics] Elasticsearch upsert error: ${err?.message}`,
        "ERROR:",
        "red"
      );
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.use(router);
}

module.exports = { registerDiagnosticsRoutes };