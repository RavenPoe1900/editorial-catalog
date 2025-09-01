// graphql/scalars.js
// Common scalars used across modules.

const { DateTimeResolver, ObjectIDResolver } = require("graphql-scalars");

module.exports = {
  Date: DateTimeResolver,
  ObjectID: ObjectIDResolver,
};