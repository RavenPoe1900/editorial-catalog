/**
 * Enumerations related to Product editorial flow and units.
 * Keep string values stable across the system.
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