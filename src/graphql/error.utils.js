/**
 * @fileoverview GraphQL error normalization helpers.
 *
 * Responsibilities:
 *  - Convert service-layer result objects {status, error, data} into GraphQL errors with codes.
 *  - Provide unwrap() to streamline resolver code (throw on >=400).
 *
 * Mapping:
 *  - 400 -> BAD_REQUEST
 *  - 401 -> UNAUTHENTICATED
 *  - 403 -> FORBIDDEN
 *  - 404 -> NOT_FOUND
 *  - Else -> INTERNAL_SERVER_ERROR
 *
 * Future:
 *  - Add logging hook for high-severity server errors.
 *  - Correlate errors with tracing spans.
 */
const { GraphQLError } = require("graphql");

function toGraphQLError(result, fallbackMessage = "Error") {
  const status = result?.status || 500;
  const message = result?.error || fallbackMessage;
  const code =
    status === 400
      ? "BAD_REQUEST"
      : status === 401
      ? "UNAUTHENTICATED"
      : status === 403
      ? "FORBIDDEN"
      : status === 404
      ? "NOT_FOUND"
      : "INTERNAL_SERVER_ERROR";

  return new GraphQLError(message, {
    extensions: { code, status },
  });
}

function unwrap(result, fallbackMessage) {
  if (!result) {
    throw new GraphQLError("Invalid service response", {
      extensions: { code: "INTERNAL_SERVER_ERROR", status: 500 },
    });
  }
  if (result.status >= 400) {
    throw toGraphQLError(result, fallbackMessage);
  }
  return result.data ?? result;
}

module.exports = { toGraphQLError, unwrap };