/**
 * @fileoverview @auth directive implementation.
 *
 * Responsibilities:
 *  - Enforce authentication (presence of ctx.user).
 *  - Optionally enforce role-based authorization (roles: [RoleName]).
 *
 * Design Choices:
 *  - Implemented as schema transformer to wrap field resolvers.
 *  - Role comparison normalized to lowercase to avoid casing issues.
 *
 * Error Contract:
 *  - Throws Error with .status and .code for downstream formatError handling.
 *
 * Future:
 *  - Expand to accept mode: ANY|ALL for role arrays.
 *  - Integrate with permissions matrix or policy engine.
 */
const { mapSchema, getDirective, MapperKind } = require("@graphql-tools/utils");
const { defaultFieldResolver } = require("graphql");

const authDirectiveSDL = /* GraphQL */ `
  directive @auth(roles: [RoleName!]) on OBJECT | FIELD_DEFINITION
`;

function makeAuthDirectiveTransformer() {
  return (schema) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directives = getDirective(schema, fieldConfig, "auth") || [];
        if (directives.length === 0) return fieldConfig;

        const { resolve = defaultFieldResolver } = fieldConfig;
        const { roles = [] } = directives[0] || {};

        fieldConfig.resolve = async function (source, args, ctx, info) {
          if (!ctx?.user) {
            const err = new Error("Unauthenticated");
            err.status = 401;
            err.code = "UNAUTHENTICATED";
            throw err;
          }

            const required = (roles || []).map((r) =>
              String(r).toLowerCase()
            );
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