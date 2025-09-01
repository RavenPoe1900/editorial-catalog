const mongoose = require("mongoose");
const baseSchema = require("../../../_shared/db/baseSchema");
const { ProductStatus, WeightUnit } = require("./product.enum");

/**
 * Embedded schema for manufacturer details.
 */
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

/**
 * Product schema aligned with GS1 concepts.
 */
const productSchema = new mongoose.Schema({
  gtin: {
    type: String,
    required: [true, "El código GTIN es obligatorio"],
    unique: true,
    trim: true,
    validate: {
      validator: function (v) {
        // Basic GTIN validation: numeric, 8-14 digits
        return /^\d{8,14}$/.test(v);
      },
      message: (props) =>
        `${props.value} no es un GTIN válido (debe ser numérico y tener entre 8-14 dígitos)`,
    },
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

// Base timestamps/soft-delete
productSchema.add(baseSchema);

// Useful indexes
productSchema.index({ brand: 1, name: 1 });
productSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);