/**
 * @fileoverview GraphQL mounting over Express.
 *
 * Features:
 *  - Asynchronous schema build
 *  - Endpoint logging grouped by module
 *  - Resilient context builder (invalid token -> user null)
 *  - Playground only outside production
 *  - Minimal error formatting (no sensitive stack leakage)
 *
 * Refactor:
 *  - Removed direct process.env usage; relies on config.SERVER.nodeEnv
 */
const express = require("express");
const { createHandler } = require("graphql-http/lib/use/express");
const { ruruHTML } = require("ruru/server");
const { buildExecutableSchema } = require("./schema");
const { buildContext } = require("./context");
const { GraphQLObjectType } = require("graphql");
const { printEndpoints, printEndpointDetail, logger } = require("../_shared/utils/logger.js");
const config = require("../_shared/config/config");

const GRAPHQL_PATH = "/graphql";
const GRAPHIQL_PATH = "/graphiql";

/**
 * Attempt to infer module grouping name for logging.
 */
function inferModuleName(fieldName = "") {
  const lower = String(fieldName).toLowerCase();
  if (["me", "login", "register", "refreshtoken"].includes(lower)) return "Auth";
  const direct = {
    user: "User",
    users: "User",
    role: "Role",
    roles: "Role",
    product: "Product",
    products: "Product",
    createuser: "User",
    updateuser: "User",
    softdeleteuser: "User",
    createrole: "Role",
    updaterole: "Role",
    softdeleterole: "Role",
    deleterolepermanent: "Role",
    createproduct: "Product",
    updateproduct: "Product",
    approveproduct: "Product",
  };
  if (direct[lower]) return direct[lower];
  const prefixes = [
    "create",
    "update",
    "delete",
    "softdelete",
    "approve",
    "get",
    "set",
    "add",
    "remove",
  ];
  let base = lower;
  for (const p of prefixes) {
    if (base.startsWith(p)) {
      base = base.slice(p.length);
      break;
    }
  }
  base = base.replace(/permanent$/, "");
  if (base.endsWith("s") && base.length > 1) base = base.slice(0, -1);
  if (!base) return null;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Print grouped endpoints.
 */
function printGraphQLEndpoints(schema) {
  const q = schema.getQueryType();
  const m = schema.getMutationType();
  const groups = new Map();
  const collect = (type, method) => {
    if (!type || !(type instanceof GraphQLObjectType)) return;
    const fields = type.getFields();
    for (const name of Object.keys(fields)) {
      const moduleName = inferModuleName(name);
      if (!moduleName) continue;
      const key = `${moduleName}|${method}`;
      if (!groups.has(key)) {
        groups.set(key, { module: moduleName, method, ops: [] });
      }
      groups.get(key).ops.push(name);
    }
  };
  collect(q, "QUERY");
  collect(m, "MUTATION");
  for (const { module, method, ops } of Array.from(groups.values()).sort(
    (a, b) =>
      a.module === b.module
        ? a.method.localeCompare(b.method)
        : a.module.localeCompare(b.module)
  )) {
    printEndpoints(module, method);
    ops
      .sort((a, b) => a.localeCompare(b))
      .forEach((op) => printEndpointDetail(module, op, method));
  }
}

/**
 * Promise timeout wrapper to avoid silent hangs.
 */
function withTimeout(promise, ms, label = "operation") {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timeout after ${ms}ms`)),
        ms
      );
    }),
  ]);
}

/**
 * Register /graphql and optionally /graphiql.
 */
function setupGraphQL(app) {
  logger("[GraphQL] setupGraphQL() invoked");
  logger("[GraphQL] Building executable schema (async)...");

  const schemaPromise = new Promise((resolve) => setTimeout(resolve, 0))
    .then(() => buildExecutableSchema())
    .then((schema) => {
      logger("[GraphQL] Schema built successfully");
      setTimeout(() => {
        try {
          printGraphQLEndpoints(schema);
        } catch (err) {
          console.error("printGraphQLEndpoints error:", err);
        }
      }, 0);
      return schema;
    })
    .catch((err) => {
      logger(
        `[GraphQL] FATAL: buildExecutableSchema() failed: ${err?.message}`,
        "ERROR:",
        "red"
      );
      throw err;
    });

  logger(`[GraphQL] Registering route ${GRAPHQL_PATH}`);

  app.all(
    GRAPHQL_PATH,
    express.json({ limit: "1mb" }),
    async (req, res) => {
      try {
        const schema = await withTimeout(schemaPromise, 30000, "schemaPromise");
        const handler = createHandler({
          schema,
          context: async (r) => {
            try {
              return await withTimeout(
                buildContext({ req: r }),
                5000,
                "buildContext"
              );
            } catch (err) {
              logger(
                `[GraphQL] context build error: ${err?.message}`,
                "WARN:",
                "yellow"
              );
              return { user: null, req: r };
            }
          },
          formatError: (e) => ({
            message: e.message,
            path: e.path,
            locations: e.locations,
            extensions: e.extensions,
          }),
        });
        return handler(req, res);
      } catch (err) {
        logger(`[GraphQL] handler error: ${err?.message}`, "ERROR:", "red");
        if (!res.headersSent) {
          res.status(500).json({
            errors: [{ message: "Internal server error in GraphQL handler" }],
            data: null,
          });
        }
      }
    }
  );

  logger(`[GraphQL] Route registered at ${GRAPHQL_PATH}`);

  if (config.SERVER.nodeEnv !== "production") {
    logger(`[GraphQL] Registering playground at ${GRAPHIQL_PATH}`);
    app.get(GRAPHIQL_PATH, (_req, res) => {
      res.type("text/html").send(ruruHTML({ endpoint: GRAPHQL_PATH }));
    });
  }
}

module.exports = { setupGraphQL };