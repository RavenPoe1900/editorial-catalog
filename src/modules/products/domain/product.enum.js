/**
 * Enumeración de estados de productos
 * @readonly
 * @enum {string}
 */
const ProductStatus = Object.freeze({
  /** Producto pendiente de revisión */
  PENDING_REVIEW: "PENDING_REVIEW",
  /** Producto aprobado y publicado */
  PUBLISHED: "PUBLISHED"
});

/**
 * Enumeración de tipos de operaciones en productos
 * @readonly
 * @enum {string}
 */
const OperationType = Object.freeze({
  /** Creación de producto */
  CREATE: "CREATE",
  /** Actualización de producto */
  UPDATE: "UPDATE",
  /** Cambio de estado del producto */
  STATUS_CHANGE: "STATUS_CHANGE"
});

/**
 * Enumeración de unidades de peso
 * @readonly
 * @enum {string}
 */
const WeightUnit = Object.freeze({
  GRAM: "g",
  KILOGRAM: "kg",
  MILLILITER: "ml",
  LITER: "l",
  OUNCE: "oz",
  POUND: "lb"
});

module.exports = {
  ProductStatus,
  OperationType,
  WeightUnit
};