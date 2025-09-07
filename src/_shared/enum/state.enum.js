/**
 * @fileoverview Generic state enumeration (workflow abstraction).
 *
 * Values:
 *  - pending, completed, cancelled
 *
 * Suggestion:
 *  - If scoped to a specific domain (e.g., orders, tasks) move near that module.
 */
const StateTypeEnum = Object.freeze({
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

module.exports = StateTypeEnum;