// Mounts GraphQL at "/graphql", prints grouped Express-style mapped routes + per-operation details,
// and exposes a dev playground at "/graphiql".
// Logs show the module/owner (Role/User/Product/Auth) and then each operation, without module duplicates.

console.log("GraphQL index.js: Módulo cargado");

const express = require("express");
const { createHandler } = require("graphql-http/lib/use/express");
const { ruruHTML } = require("ruru/server");
const { buildExecutableSchema } = require("./schema");
const { buildContext } = require("./context");
const { GraphQLObjectType } = require("graphql");
const { printEndpoints, printEndpointDetail, logger } = require("../_shared/utils/logger.js");

const GRAPHQL_PATH = "/graphql";
const GRAPHIQL_PATH = "/graphiql";

/**
 * Try to infer a logical module/owner name from a field name.
 */
function inferModuleName(fieldName = "") {
  const lower = String(fieldName).toLowerCase();
  if (["me", "login", "register", "refreshtoken"].includes(lower)) return "Auth";
  const direct = { user: "User", users: "User", role: "Role", roles: "Role", product: "Product", products: "Product", createuser: "User", updateuser: "User", softdeleteuser: "User", createrole: "Role", updaterole: "Role", softdeleterole: "Role", deleterolepermanent: "Role", createproduct: "Product", updateproduct: "Product", approveproduct: "Product" };
  if (direct[lower]) return direct[lower];
  const prefixes = ["create", "update", "delete", "softdelete", "approve", "get", "set", "add", "remove"];
  let base = lower;
  for (const p of prefixes) { if (base.startsWith(p)) { base = base.slice(p.length); break; } }
  base = base.replace(/permanent$/, "");
  if (base.endsWith("s") && base.length > 1) base = base.slice(0, -1);
  if (!base) return null;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Print grouped operations by module and method (QUERY/MUTATION).
 */
function printGraphQLEndpoints(schema) {
  console.log("GraphQL printGraphQLEndpoints: Comenzando");
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
      if (!groups.has(key)) { groups.set(key, { module: moduleName, method, ops: [] }); }
      groups.get(key).ops.push(name);
    }
  };
  collect(q, "QUERY");
  collect(m, "MUTATION");
  for (const { module, method, ops } of Array.from(groups.values()).sort((a, b) => (a.module === b.module ? a.method.localeCompare(b.method) : a.module.localeCompare(b.module)))) {
    printEndpoints(module, method);
    ops.sort((a, b) => a.localeCompare(b)).forEach((op) => printEndpointDetail(module, op, method));
  }
  console.log("GraphQL printGraphQLEndpoints: Completado");
}

/**
 * Small helper to avoid hangs
 */
function withTimeout(promise, ms, label = "operation") {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms); }),
  ]);
}

/**
 * Attach the GraphQL HTTP handler to "/graphql".
 * @param {import('express').Express} app
 */
function setupGraphQL(app) {
  console.log("GraphQL setupGraphQL: Función invocada");
  logger("[GraphQL] setupGraphQL() called");
  logger("[GraphQL] Building executable schema (async)...");
  console.log("GraphQL setupGraphQL: Construyendo schema (async)...");

  const schemaPromise = new Promise(resolve => setTimeout(resolve, 0))
    .then(() => {
      console.log("GraphQL setupGraphQL: Iniciando buildExecutableSchema()");
      return buildExecutableSchema();
    })
    .then((schema) => {
      console.log("GraphQL setupGraphQL: Schema construido con éxito");
      logger("[GraphQL] Schema built successfully");
      setTimeout(() => { try { printGraphQLEndpoints(schema); } catch (err) { console.error("Error en printGraphQLEndpoints:", err); } }, 0);
      return schema;
    })
    .catch((err) => {
      console.log("GraphQL setupGraphQL: Error construyendo schema:", err);
      logger(`[GraphQL] FATAL: buildExecutableSchema() failed: ${err?.message}`, "ERROR:", "red");
      throw err;
    });

  console.log("GraphQL setupGraphQL: Registrando ruta", GRAPHQL_PATH);
  logger(`[GraphQL] Registering route ${GRAPHQL_PATH}`);
  
  app.all(
    GRAPHQL_PATH,
    (req, res, next) => { console.log(`GraphQL Middleware 1: Request recibida: ${req.method} ${req.url}`); next(); },
    express.json({ limit: '1mb' }),
    (req, res, next) => {
      console.log("GraphQL Middleware 2: Body parser completado");
      try {
        if (req.body && Object.keys(req.body).length > 0) {
          const { query, variables } = req.body;
          console.log(`GraphQL Body: query=${query?.substring(0, 50)}... vars=${JSON.stringify(variables || {}).substring(0, 50)}...`);
        } else { console.log("GraphQL Body: Vacío o no es JSON"); }
      } catch (e) { console.log("GraphQL Body: Error inspeccionando body", e); }
      next();
    },
    async (req, res, next) => {
      console.log("GraphQL Handler: Inicio del procesamiento");
      try {
        console.log("GraphQL Handler: Esperando schema promise...");
        const schema = await withTimeout(schemaPromise, 30000, "schemaPromise");
        console.log("GraphQL Handler: Schema obtenido correctamente");
        
        // ==================== INICIO DE LA CORRECCIÓN ====================
        // La función `safeContext` ahora pasa el objeto `req` correctamente a `buildContext`.
        const safeContext = async (reqFromHandler, resFromHandler) => {
          console.log("GraphQL Context: Iniciando buildContext");
          try {
            // `graphql-http` llama a esta función con `(req, res)`.
            // `buildContext` espera `{ req }` o solo `req`. Pasamos `{ req }` para ser explícitos.
            const contextPromise = buildContext({ req: reqFromHandler });
            const ctx = await withTimeout(contextPromise, 5000, "buildContext");
            console.log("GraphQL Context: Contexto creado con éxito");
            return ctx;
          } catch (err) {
            console.error("GraphQL Context: Error o timeout en buildContext", err);
            logger(`[GraphQL] context error: ${err?.message}`, "WARN:", "yellow");
            return { user: null, req: reqFromHandler }; // Devuelve un contexto mínimo
          }
        };
        // ===================== FIN DE LA CORRECCIÓN ======================

        console.log("GraphQL Handler: Creando handler...");
        const handler = createHandler({
          schema,
          context: safeContext, // Pasamos nuestra función adaptadora corregida
          formatError: (e) => {
            console.log("GraphQL Error:", e);
            return { message: e.message, path: e.path, locations: e.locations, extensions: e.extensions };
          },
        });
        
        console.log("GraphQL Handler: Ejecutando handler con req/res");
        return handler(req, res);

      } catch (err) {
        console.error("GraphQL Handler: Error general", err);
        logger(`[GraphQL] handler error: ${err?.message}`, "ERROR:", "red");
        if (!res.headersSent) {
          res.status(500).json({ errors: [{ message: "Internal server error in GraphQL handler" }], data: null });
        }
      }
    }
  );
  
  console.log("GraphQL: Endpoint /graphql registrado");
  logger(`[GraphQL] Route registered at ${GRAPHQL_PATH}`);

  if (process.env.NODE_ENV !== "production") {
    console.log("GraphQL setupGraphQL: Registrando playground", GRAPHIQL_PATH);
    logger(`[GraphQL] Registering playground at ${GRAPHIQL_PATH}`);
    app.get(GRAPHIQL_PATH, (_req, res) => {
      console.log("GraphQL Playground: Sirviendo playground");
      res.type("text/html").send(ruruHTML({ endpoint: GRAPHQL_PATH }));
    });
  }
  
  console.log("GraphQL setupGraphQL: Configuración completa");
}

console.log("GraphQL index.js: Exportando setupGraphQL");
module.exports = { setupGraphQL };