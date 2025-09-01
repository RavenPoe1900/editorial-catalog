const mongoose = require("mongoose");
const baseSchema = require("../../../_shared/db/baseSchema");
const { ProductStatus, WeightUnit } = require("./product.enum");

const manufacturerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "El nombre del fabricante es obligatorio"]
  },
  code: { 
    type: String,
    trim: true
  },
  country: { 
    type: String,
    trim: true
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  // Identificador GS1 (GTIN)
  gtin: { 
    type: String, 
    required: [true, "El código GTIN es obligatorio"], 
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Validación básica GTIN: numérico, 8-14 dígitos
        return /^\d{8,14}$/.test(v);
      },
      message: props => `${props.value} no es un GTIN válido (debe ser numérico y tener entre 8-14 dígitos)`
    }
  },
  
  // Información básica del producto
  name: { 
    type: String, 
    required: [true, "El nombre del producto es obligatorio"],
    trim: true,
    index: true
  },
  description: { 
    type: String,
    trim: true,
    index: true
  },
  brand: { 
    type: String, 
    required: [true, "La marca es obligatoria"],
    trim: true,
    index: true
  },
  
  // Información del fabricante
  manufacturer: { 
    type: manufacturerSchema, 
    required: [true, "La información del fabricante es obligatoria"]
  },
  
  // Peso y unidad
  netWeight: { 
    type: Number,
    min: [0, "El peso no puede ser negativo"]
  },
  weightUnit: { 
    type: String,
    enum: {
      values: Object.values(WeightUnit),
      message: "Unidad de peso no válida"
    }
  },
  
  // Estado editorial
  status: { 
    type: String, 
    enum: {
      values: Object.values(ProductStatus),
      message: "Estado de producto no válido"
    },
    default: ProductStatus.PENDING_REVIEW,
    required: true,
    index: true
  },
  
  // Relación con el usuario que creó el producto
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true
  }
});

// Añadir campos base (createdAt, updatedAt, deletedAt)
productSchema.add(baseSchema);

// Índices compuestos para búsquedas frecuentes
productSchema.index({ brand: 1, name: 1 });
productSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);