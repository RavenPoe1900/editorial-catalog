/**
 * @fileoverview ProductChange audit schema.
 *
 * Purpose:
 *  - Immutable audit trail for product state transitions and edits.
 *
 * Fields:
 *  - previousValues / newValues stored as JSON strings for snapshot fidelity.
 *  - operation limited to enumerated values ("CREATE", "UPDATE", "STATUS_CHANGE").
 *
 * Indexes:
 *  - productId + changedAt (desc sorting facilitated)
 *  - productId alone for quick history filtering
 *
 * Validation:
 *  - Each JSON string must parse successfully (guarantees consumers can rely on parse).
 *
 * Soft Delete:
 *  - baseSchema attaches deletedAt (though typically audits are not soft-deleted; retained for uniformity).
 *
 * Future:
 *  - Consider compression if snapshots get large.
 *  - Add diff metadata for faster UI rendering.
 */
const mongoose = require("mongoose");
const baseSchema = require("../../../_shared/db/baseSchema");
const { OperationType } = require("../../products/domain/product.enum");

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
      message: "previousValues must be valid JSON",
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
      message: "newValues must be valid JSON",
    },
  },

  operation: {
    type: String,
    enum: {
      values: Object.values(OperationType),
      message: "Invalid operation type",
    },
    required: true,
  },
});

productChangeSchema.add(baseSchema);
productChangeSchema.index({ productId: 1, changedAt: -1 });

module.exports = mongoose.model("ProductChange", productChangeSchema);