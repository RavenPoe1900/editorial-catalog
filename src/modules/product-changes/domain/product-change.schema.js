const mongoose = require("mongoose");
const baseSchema = require("../../../_shared/db/baseSchema");
const { OperationType } = require("../../products/domain/product.enum");

const productChangeSchema = new mongoose.Schema({
  // Producto al que se refiere el cambio
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product", 
    required: true,
    index: true
  },
  
  // Usuario que realizó el cambio
  changedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Momento en que se realizó el cambio
  changedAt: { 
    type: Date, 
    required: true, 
    default: Date.now,
    index: true
  },
  
  // Valores anteriores y nuevos en formato JSON
  previousValues: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        try {
          JSON.parse(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: "El formato de previousValues debe ser JSON válido"
    }
  },
  newValues: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        try {
          JSON.parse(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: "El formato de newValues debe ser JSON válido"
    }
  },
  
  // Tipo de operación realizada
  operation: { 
    type: String, 
    enum: {
      values: Object.values(OperationType),
      message: "Tipo de operación no válido"
    },
    required: true 
  }
});

// Añadir campos base
productChangeSchema.add(baseSchema);

// Índice para consultas por fecha
productChangeSchema.index({ productId: 1, changedAt: -1 });

module.exports = mongoose.model("ProductChange", productChangeSchema);