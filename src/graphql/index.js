// Mounts GraphQL at "/graphql", prints grouped Express-style mapped routes + per-operation details,
// and exposes a dev playground at "/graphiql".
// Logs show the module/owner (Role/User/Product/Auth) and then each operation, without module duplicates.

const { createHandler } = require("graphql-http/lib/use/express");
const { ruruHTML } = require("ruru/server");
const { buildExecutableSchema } = require("./schema");
const { buildContext } = require("./context");
const { GraphQLObjectType } = require("graphql");
const { printEndpoints, printEndpointDetail } = require("../_shared/utils/logger.js");

const GRAPHQL_PATH = "/graphql";
const GRAPHIQL_PATH = "/graphiql";

/**
 * Try to infer a logical module/owner name from a field name.
 * - Auth: me, login, register, refreshToken
 * - Explicit maps for user/role/product queries & mutations
 * - Fallback: strip common prefixes/suffixes, singularize, capitalize
 */
function inferModuleName(fieldName = "") {
  const lower = String(fieldName).toLowerCase();

  // Auth bucket
  if (["me", "login", "register", "refreshtoken"].includes(lower)) return "Auth";

  // Direct maps for common domains
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

  // Generic heuristic
  const prefixes = ["create", "update", "delete", "softdelete", "approve", "get", "set", "add", "remove"];
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
 * Print grouped operations by module and method (QUERY/MUTATION),
 * followed by per-operation details under each module.
 * - Avoid duplicates at module level (role/roles -> one "Role {QUERY}")
 * - Keep operation details per field (roles and role both listed under Role)
 */
function printGraphQLEndpoints(schema) {
  const q = schema.getQueryType();
  const m = schema.getMutationType();

  const groups = new Map(); // key: "Module|METHOD" -> { module, method, ops: [] }

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

  // Print grouped headers (no duplicates) then details
  for (const { module, method, ops } of Array.from(groups.values()).sort((a, b) => {
    if (a.module === b.module) return a.method.localeCompare(b.method);
    return a.module.localeCompare(b.module);
  })) {
    printEndpoints(module, method);
    // Operation details sorted alphabetically for stable logs
    ops.sort((a, b) => a.localeCompare(b)).forEach((op) => {
      printEndpointDetail(module, op, method);
    });
  }
}

/**
 * Attach the GraphQL HTTP handler to "/graphql" and print operations once at startup.
 * @param {import('express').Express} app
 */
function setupGraphQL(app) {
  const schemaPromise = buildExecutableSchema().then((schema) => {
    printGraphQLEndpoints(schema);
    return schema;
  });

  app.all(GRAPHQL_PATH, async (req, res, next) => {
    try {
      const schema = await schemaPromise;
      return createHandler({
        schema,
        context: buildContext,
        formatError: (e) => ({
          message: e.message,
          path: e.path,
          locations: e.locations,
          extensions: e.extensions,
        }),
      })(req, res);
    } catch (err) {
      next(err);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    app.get(GRAPHIQL_PATH, (_req, res) => {
      res
        .type("text/html")
        .send(
          ruruHTML({
            endpoint: GRAPHQL_PATH,
          })
        );
    });
  }
}

module.exports = { setupGraphQL };