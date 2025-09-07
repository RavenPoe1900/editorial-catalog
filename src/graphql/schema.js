/**
 * @fileoverview GraphQL executable schema factory.
 *
 * Responsibilities:
 *  - Build root SDL (base scalars, PageInfo, RoleName enum, @auth directive).
 *  - Load module SDL + resolvers dynamically.
 *  - Apply @auth directive transformer post-schema creation.
 *
 * Consistency:
 *  - RoleName enum dynamically derived from shared RoleTypeEnum to avoid duplication.
 *
 * Extensibility:
 *  - Add more directives (e.g., @rateLimit, @cacheControl) in same pattern.
 *
 * Performance:
 *  - Schema built once at startup; for hot-reload workflows you could rebuild on demand.
 */
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { loadModuleTypeDefsAndResolvers } = require("./modules.loader");
const scalars = require("./scalars");
const RoleTypeEnum = require("../_shared/enum/roles.enum");
const { authDirectiveSDL, makeAuthDirectiveTransformer } = require("./directives/auth");

function buildRootSDL() {
  const roleValues = Object.values(RoleTypeEnum)
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map((v) => v.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase());

  const RoleEnumSDL = `
    enum RoleName { ${roleValues.join(" ")} }
  `;

  return /* GraphQL */ `
    scalar Date
    scalar ObjectID

    ${RoleEnumSDL}

    """
    Standard pagination info.
    """
    type PageInfo {
      page: Int!
      limit: Int!
      totalItems: Int!
      totalPages: Int!
      hasNextPage: Boolean!
      hasPrevPage: Boolean!
    }

    ${authDirectiveSDL}

    type Query
    type Mutation
  `;
}

/**
 * Assemble and return executable schema.
 */
async function buildExecutableSchema() {
  const rootTypeDefs = buildRootSDL();
  const { moduleTypeDefs, resolvers } = await loadModuleTypeDefsAndResolvers();

  const schema = makeExecutableSchema({
    typeDefs: [rootTypeDefs, ...moduleTypeDefs],
    resolvers: {
      Date: scalars.Date,
      ObjectID: scalars.ObjectID,
      ...resolvers,
    },
  });

  const applyAuth = makeAuthDirectiveTransformer();
  return applyAuth(schema);
}

module.exports = { buildExecutableSchema };