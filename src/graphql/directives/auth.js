const { mapSchema, getDirective, MapperKind } = require("@graphql-tools/utils");
const { defaultFieldResolver } = require("graphql");

/**
 * SDL for the @auth directive.
 * Usage:
 *   type Query {
 *     me: User @auth
 *     users: [User!]! @auth(roles: [ADMIN, MANAGER])
 *   }
 */
const authDirectiveSDL = /* GraphQL */ `
  directive @auth(roles: [RoleName!]) on OBJECT | FIELD_DEFINITION
`;

/**
 * Schema transformer that wraps resolvers to enforce:
 * - Authentication when @auth is present.
 * - Optional role-based authorization when roles are provided.
 * Expects ctx.user = { userId, roles: [string] } or null.
 */
function makeAuthDirectiveTransformer() {
  return (schema) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directives = getDirective(schema, fieldConfig, "auth") || [];
        if (directives.length === 0) return fieldConfig;

        const { resolve = defaultFieldResolver } = fieldConfig;
        const { roles = [] } = directives[0] || {};

        fieldConfig.resolve = async function (source, args, ctx, info) {
          // Authentication required
          if (!ctx?.user) {
            const err = new Error("Unauthenticated");
            err.status = 401;
            err.code = "UNAUTHENTICATED";
            throw err;
          }

          // Role-based authorization if roles specified
          const required = (roles || []).map((r) => String(r).toLowerCase());
          if (required.length > 0) {
            const userRoles = Array.from(
              new Set(
                (ctx.user.roles || [])
                  .filter(Boolean)
                  .map((x) => String(x).toLowerCase())
              )
            );
            const ok = userRoles.some((r) => required.includes(r));
            if (!ok) {
              const err = new Error("Forbidden");
              err.status = 403;
              err.code = "FORBIDDEN";
              throw err;
            }
          }

          return resolve.call(this, source, args, ctx, info);
        };

        return fieldConfig;
      },
    });
}

module.exports = { authDirectiveSDL, makeAuthDirectiveTransformer };