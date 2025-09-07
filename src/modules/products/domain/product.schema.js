/**
 * @fileoverview Product schema (GS1-aligned).
 *
 * Constraints:
 *  - gtin: unique, numeric patterns and check digit validation (via isValidGTIN).
 *  - manufacturer: embedded subdocument (no separate collection).
 *
 * Indexing:
 *  - brand + name compound
 *  - status + createdAt (for workflow queries)
 *  - text-like fields kept as strings; search responsibilities offloaded to ES index (separate integration).
 *
 * Workflow:
 *  - status transitions managed in service layer.
 *
 * Future:
 *  - Add slug field for canonical URLs.
 *  - Add version history or embed lastChange summary.
 */
const mongoose = require("mongoose");
const baseSchema = require("../../../_shared/db/baseSchema");
const { ProductStatus, WeightUnit } = require("./product.enum");
const { isValidGTIN } = require("./gtin.util");

const manufacturerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del fabricante es obligatorio"],
    },
    code: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema({
  gtin: {
    type: String,
    required: [true, "El código GTIN es obligatorio"],
    unique: true,
    trim: true,
    validate: [
      {
        validator: function (v) {
          return /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(v);
        },
        message:
          "GTIN inválido: debe ser numérico con 8, 12, 13 o 14 dígitos",
      },
      {
        validator: function (v) {
          return isValidGTIN(v);
        },
        message: "GTIN inválido: dígito verificador incorrecto",
      },
    ],
  },

  name: {
    type: String,
    required: [true, "El nombre del producto es obligatorio"],
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
    index: true,
  },
  brand: {
    type: String,
    required: [true, "La marca es obligatoria"],
    trim: true,
    index: true,
  },

  manufacturer: {
    type: manufacturerSchema,
    required: [true, "La información del fabricante es obligatoria"],
  },

  netWeight: {
    type: Number,
    min: [0, "El peso no puede ser negativo"],
  },
  weightUnit: {
    type: String,
    enum: {
      values: Object.values(WeightUnit),
      message: "Unidad de peso no válida",
    },
  },

  status: {
    type: String,
    enum: {
      values: Object.values(ProductStatus),
      message: "Estado de producto no válido",
    },
    default: ProductStatus.PENDING_REVIEW,
    required: true,
    index: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
});

productSchema.add(baseSchema);

productSchema.index({ brand: 1, name: 1 });
productSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);