// graphql/error.utils.js
// Small helpers to normalize service-layer results into GraphQL errors.

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