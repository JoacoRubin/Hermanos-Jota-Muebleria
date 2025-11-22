const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  precio: {
    type: Number,
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  imagenUrl: String
})

const orderSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  estado: {
    type: String,
    enum: ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'],
    default: 'pendiente'
  },
  direccionEnvio: {
    type: String,
    required: true
  },
  notas: String
}, {
  timestamps: true
})

// Método virtual para obtener la cantidad total de items
orderSchema.virtual('cantidadTotal').get(function() {
  return this.items.reduce((total, item) => total + item.cantidad, 0)
})

// Asegurar que los virtuals se incluyan en JSON
orderSchema.set('toJSON', { virtuals: true })
orderSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Order', orderSchema)
