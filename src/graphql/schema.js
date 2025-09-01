// graphql/schema.js
// Builds the executable GraphQL schema from:
// - Root SDL (shared scalars, PageInfo, RoleName enum, @auth directive)
// - Auto-discovered module SDL and resolvers under "src/**/graphql"
// - Applies the @auth directive after schema creation

const { makeExecutableSchema } = require("@graphql-tools/schema");
const { loadModuleTypeDefsAndResolvers } = require("./modules.loader");
const scalars = require("./scalars");
const RoleTypeEnum = require("../_shared/enum/roles.enum");
const { authDirectiveSDL, makeAuthDirectiveTransformer } = require("./directives/auth");

/**
 * Build root SDL including shared scalars, PageInfo, RoleName enum and @auth directive.
 * RoleName enum is derived from the shared RoleTypeEnum to avoid duplication.
 */
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
 * Create the executable schema from root SDL and auto-discovered modules.
 * Applies the @auth directive after schema creation.
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