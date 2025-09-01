const mongoose = require("mongoose");
const baseSchema = require("../../../_shared/db/baseSchema");
const { OperationType } = require("../../products/domain/product.enum");

/**
 * Stores an audit record for a product change.
 * previousValues and newValues are persisted as JSON strings for immutability.
 */
const productChangeSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },

  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  changedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },

  previousValues: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        try {
          JSON.parse(v);
          return true;
        } catch {
          return false;
        }
      },
      message: "El formato de previousValues debe ser JSON válido",
    },
  },

  newValues: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        try {
          JSON.parse(v);
          return true;
        } catch {
          return false;
        }
      },
      message: "El formato de newValues debe ser JSON válido",
    },
  },

  operation: {
    type: String,
    enum: {
      values: Object.values(OperationType),
      message: "Tipo de operación no válido",
    },
    required: true,
  },
});

productChangeSchema.add(baseSchema);
productChangeSchema.index({ productId: 1, changedAt: -1 });

module.exports = mongoose.model("ProductChange", productChangeSchema);