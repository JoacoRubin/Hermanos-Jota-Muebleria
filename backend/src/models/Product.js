const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String, default: '' },
  precio: { type: Number, required: true, default: 0 },
  stock: { type: Number, default: 0 },
  imagenUrl: { type: String, default: '' },
  detalles: { type: Object, default: {} }
}, { timestamps: true })

module.exports = mongoose.model('Product', ProductSchema)
