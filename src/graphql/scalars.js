/**
 * @fileoverview Common custom scalars exported to schema builder.
 *
 * Date:
 *  - Uses graphql-scalars DateTimeResolver for ISO date-time handling.
 * ObjectID:
 *  - Validates MongoDB ObjectId format (string).
 *
 * Future:
 *  - Add Email, URL, JSON or custom BigInt if domain requires.
 */
const { DateTimeResolver, ObjectIDResolver } = require("graphql-scalars");

module.exports = {
  Date: DateTimeResolver,
  ObjectID: ObjectIDResolver,
};