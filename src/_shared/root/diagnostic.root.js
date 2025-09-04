const express = require("express");
const { logger } = require("../utils/logger");
const { pingES } = require("../integrations/elasticsearch/es.client");
const { ensureProductIndex, upsertProduct } = require("../integrations/elasticsearch/es.product.indexer");
const { connect: rabbitConnect, publish: rabbitPublish } = require("../integrations/rabbitmq/rabbitmq");

/**
 * Register diagnostics/health routes.
 * These routes are intended for local testing and ops checks.
 * You may protect them behind an admin-only middleware in production.
 */
function registerDiagnosticsRoutes(app) {
  const router = express.Router();

  // Elasticsearch ping
  router.get("/health/elasticsearch", async (_req, res) => {
    try {
      const ok = await pingES();
      if (ok) {
        logger("[Diagnostics] Elasticsearch ping OK", "INFO:", "green");
        return res.status(200).json({ ok: true, url: process.env.ELASTICSEARCH_URL || "http://localhost:9200" });
      }
      logger("[Diagnostics] Elasticsearch ping FAILED", "WARN:", "yellow");
      return res.status(503).json({ ok: false, url: process.env.ELASTICSEARCH_URL || "http://localhost:9200" });
    } catch (err) {
      logger(`[Diagnostics] Elasticsearch ping error: ${err?.message}`, "ERROR:", "red");
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // Ensure product index exists (idempotent)
  router.get("/health/elasticsearch/index", async (_req, res) => {
    try {
      await ensureProductIndex();
      logger("[Diagnostics] Elasticsearch product index ensured", "INFO:", "green");
      return res.status(200).json({ ok: true, index: process.env.ELASTICSEARCH_PRODUCT_INDEX || "products" });
    } catch (err) {
      logger(`[Diagnostics] Ensure index error: ${err?.message}`, "ERROR:", "red");
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // RabbitMQ connectivity
  router.get("/health/rabbitmq", async (_req, res) => {
    try {
      await rabbitConnect();
      logger("[Diagnostics] RabbitMQ channel OK", "INFO:", "green");
      return res.status(200).json({
        ok: true,
        url: process.env.RABBITMQ_URL || "amqp://localhost",
        exchange: process.env.RABBITMQ_EXCHANGE || "products.events",
      });
    } catch (err) {
      logger(`[Diagnostics] RabbitMQ connect error: ${err?.message}`, "ERROR:", "red");
      return res.status(503).json({ ok: false, error: err?.message });
    }
  });

  // Publish a test message to RabbitMQ
  // Body: { routingKey?: string, payload?: object, headers?: object }
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
      logger(`[Diagnostics] RabbitMQ publish "${routingKey}" -> ${ok ? "OK" : "FAILED"}`, ok ? "INFO:" : "WARN:", ok ? "green" : "yellow");
      return res.status(status).json({ ok, routingKey, exchange: process.env.RABBITMQ_EXCHANGE || "products.events" });
    } catch (err) {
      logger(`[Diagnostics] RabbitMQ publish error: ${err?.message}`, "ERROR:", "red");
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // Upsert a test product doc into ES
  // Body: { id: string, doc: { gtin, name, brand, description, manufacturer, netWeight, weightUnit, status, createdBy } }
  router.post("/diagnostics/elasticsearch/upsert", async (req, res) => {
    try {
      const { id, doc } = req.body || {};
      if (!id || !doc) {
        return res.status(400).json({ ok: false, error: "id and doc are required" });
      }
      await upsertProduct({ _id: id, ...doc });
      logger(`[Diagnostics] Elasticsearch upsert id=${id} OK`, "INFO:", "green");
      return res.status(200).json({ ok: true, id, index: process.env.ELASTICSEARCH_PRODUCT_INDEX || "products" });
    } catch (err) {
      logger(`[Diagnostics] Elasticsearch upsert error: ${err?.message}`, "ERROR:", "red");
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.use(router);
}

module.exports = { registerDiagnosticsRoutes };