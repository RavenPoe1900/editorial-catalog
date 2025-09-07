/**
 * @fileoverview Product workflow and weight unit enums.
 *
 * ProductStatus:
 *  - PENDING_REVIEW: Created by provider; awaiting editor approval.
 *  - PUBLISHED: Visible / approved state.
 *
 * OperationType:
 *  - Used in audit log to classify change.
 *
 * WeightUnit:
 *  - Restricted list for normalization (supports filtering and analytics).
 *
 * Future:
 *  - Add REJECTED or ARCHIVED statuses if workflow expands.
 */
const ProductStatus = Object.freeze({
  PENDING_REVIEW: "PENDING_REVIEW",
  PUBLISHED: "PUBLISHED",
});

const OperationType = Object.freeze({
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  STATUS_CHANGE: "STATUS_CHANGE",
});

const WeightUnit = Object.freeze({
  GRAM: "g",
  KILOGRAM: "kg",
  MILLILITER: "ml",
  LITER: "l",
  OUNCE: "oz",
  POUND: "lb",
});

module.exports = {
  ProductStatus,
  OperationType,
  WeightUnit,
};