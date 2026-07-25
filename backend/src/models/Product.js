const mongoose = require('mongoose')
const { CATEGORIAS } = require('../constants')

const productSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: [120, 'El nombre no puede superar los 120 caracteres'],
    },
    descripcion: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'La descripción no puede superar los 2000 caracteres'],
    },
    precio: {
      type: Number,
      required: [true, 'El precio es requerido'],
      min: [0, 'El precio no puede ser negativo'],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'El stock no puede ser negativo'],
      validate: {
        validator: Number.isInteger,
        message: 'El stock debe ser un número entero',
      },
    },
    categoria: {
      type: String,
      enum: {
        values: CATEGORIAS,
        message: 'Categoría inválida: {VALUE}',
      },
      default: 'Otros',
    },
    imagenUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'La URL de la imagen es demasiado larga'],
    },
    // `Map` en vez de `Object`: obliga a que los valores sean strings y evita
    // que entre cualquier estructura arbitraria en un campo sin schema.
    detalles: {
      type: Map,
      of: String,
      default: () => new Map(),
    },
  },
  { timestamps: true }
)

productSchema.index({ precio: 1 })
productSchema.index({ stock: 1 })
productSchema.index({ categoria: 1 })
productSchema.index({ createdAt: -1 })
// Índice de texto para la búsqueda del catálogo.
productSchema.index({ nombre: 'text', descripcion: 'text' })

productSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v
    return ret
  },
})

module.exports = mongoose.model('Product', productSchema)
