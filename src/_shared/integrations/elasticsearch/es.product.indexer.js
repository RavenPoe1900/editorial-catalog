/**
 * @fileoverview Product indexing helpers (eventual consistency) for Elasticsearch.
 *
 * Functions:
 *  - ensureProductIndex(): creates index + mappings if missing (idempotent)
 *  - upsertProduct(): index or update a product document (wait_for refresh in dev)
 *  - deleteProduct(): remove product doc (ignores 404)
 *
 * Index strategy:
 *  - edge_ngram analyzer for basic autocomplete on name, brand, manufacturer.name
 *
 * Limitations:
 *  - No retries on failures (best effort)
 *  - MongoDB remains source of truth
 */
const { getES } = require("./es.client");
const { logger } = require("../../utils/logger");
const config = require("../../config/config");

const INDEX = config.SEARCH.productIndex;

async function ensureProductIndex() {
  const es = getES();
  try {
    const exists = await es.indices.exists({ index: INDEX });
    if (!exists) {
      await es.indices.create({
        index: INDEX,
        settings: {
          analysis: {
            analyzer: {
              edge_ngram_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "edge_ngram_filter"],
              },
            },
            filter: {
              edge_ngram_filter: {
                type: "edge_ngram",
                min_gram: 2,
                max_gram: 20,
              },
            },
          },
        },
        mappings: {
          properties: {
            gtin: { type: "keyword" },
            name: {
              type: "text",
              analyzer: "edge_ngram_analyzer",
              search_analyzer: "standard",
            },
            brand: {
              type: "text",
              analyzer: "edge_ngram_analyzer",
              search_analyzer: "standard",
            },
            description: { type: "text" },
            "manufacturer.name": {
              type: "text",
              analyzer: "edge_ngram_analyzer",
              search_analyzer: "standard",
            },
            "manufacturer.code": { type: "keyword" },
            "manufacturer.country": { type: "keyword" },
            netWeight: { type: "float" },
            weightUnit: { type: "keyword" },
            status: { type: "keyword" },
            createdBy: { type: "keyword" },
            createdAt: { type: "date" },
            updatedAt: { type: "date" },
          },
        },
      });
      logger(`[Elasticsearch] index "${INDEX}" created`, "INFO:", "green");
    } else {
      logger(`[Elasticsearch] index "${INDEX}" exists`, "INFO:", "green");
    }
  } catch (err) {
    logger(`[Elasticsearch] ensure index error: ${err?.message}`, "ERROR:", "red");
    throw err;
  }
}

function mapProduct(doc) {
  const src = doc?.toObject?.() ? doc.toObject() : doc;
  return {
    gtin: src.gtin,
    name: src.name,
    brand: src.brand,
    description: src.description,
    manufacturer: src.manufacturer || {},
    netWeight: src.netWeight,
    weightUnit: src.weightUnit,
    status: src.status,
    createdBy: String(src.createdBy || ""),
    createdAt: src.createdAt ? new Date(src.createdAt) : undefined,
    updatedAt: src.updatedAt ? new Date(src.updatedAt) : undefined,
  };
}

async function upsertProduct(doc) {
  try {
    const es = getES();
    await es.index({
      index: INDEX,
      id: String(doc._id || doc.id),
      document: mapProduct(doc),
      refresh: "wait_for",
    });
    logger(
      `[Elasticsearch] upsert product ${doc._id || doc.id}`,
      "INFO:",
      "green"
    );
  } catch (err) {
    logger(
      `[Elasticsearch] upsert error: ${err?.message}`,
      "WARN:",
      "yellow"
    );
  }
}

async function deleteProduct(id) {
  try {
    const es = getES();
    await es.delete({
      index: INDEX,
      id: String(id),
      refresh: "wait_for",
    });
    logger(`[Elasticsearch] delete product ${id}`, "INFO:", "green");
  } catch (err) {
    if (err?.meta?.statusCode !== 404) {
      logger(
        `[Elasticsearch] delete error: ${err?.message}`,
        "WARN:",
        "yellow"
      );
    }
  }
}

module.exports = {
  ensureProductIndex,
  upsertProduct,
  deleteProduct,
};