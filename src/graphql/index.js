// Mounts GraphQL at "/graphql", prints concise Nest-like mapped routes at startup,
// and exposes a dev playground at "/graphiql".

const { createHandler } = require("graphql-http/lib/use/express");
const { ruruHTML } = require("ruru/server");
const { buildExecutableSchema } = require("./schema");
const { buildContext } = require("./context");
const { GraphQLObjectType } = require("graphql");
const { printEndpoints } = require("../_shared/utils/logger.js");

const GRAPHQL_PATH = "/graphql";
const GRAPHIQL_PATH = "/graphiql";

/**
 * Print all GraphQL operations (Queries/Mutations) once the schema is ready.
 * Output is Nest-like and colored via printEndpoints (one line per operation).
 * @param {import('graphql').GraphQLSchema} schema
 */
function printGraphQLEndpoints(schema) {
  const q = schema.getQueryType();
  const m = schema.getMutationType();

  const collect = (type, kind) => {
    if (!type || !(type instanceof GraphQLObjectType)) return [];
    const fields = type.getFields();
    return Object.keys(fields).map((name) => ({
      path: `${GRAPHQL_PATH}/${kind}/${name}`,
      method: kind.toUpperCase(), // "QUERY" or "MUTATION"
    }));
  };

  const ops = [
    ...collect(q, "query"),
    ...collect(m, "mutation"),
  ];

  ops.forEach(({ path, method }) => printEndpoints(path, method));
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