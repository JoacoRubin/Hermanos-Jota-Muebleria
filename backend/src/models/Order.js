const mongoose = require('mongoose')
const {
  ESTADOS_PEDIDO,
  ESTADO_PEDIDO_INICIAL,
  MAX_CANTIDAD_POR_ITEM,
} = require('../constants')

/**
 * Snapshot del producto al momento de la compra.
 *
 * `nombre`, `precio` e `imagenUrl` se duplican a propósito: si mañana sube el
 * precio o se borra el producto, el pedido histórico tiene que seguir
 * mostrando lo que el cliente compró y pagó. Eso NO es denormalización
 * descuidada, es un registro contable.
 *
 * Importante: estos valores los escribe el servidor leyendo la base, nunca
 * el cliente. Ver `orders.controller.js`.
 */
const orderItemSchema = new mongoose.Schema(
  {
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    nombre: { type: String, required: true },
    precio: {
      type: Number,
      required: true,
      min: [0, 'El precio no puede ser negativo'],
    },
    cantidad: {
      type: Number,
      required: true,
      min: [1, 'La cantidad mínima es 1'],
      max: [MAX_CANTIDAD_POR_ITEM, `La cantidad máxima por ítem es ${MAX_CANTIDAD_POR_ITEM}`],
      validate: {
        validator: Number.isInteger,
        message: 'La cantidad debe ser un número entero',
      },
    },
    imagenUrl: { type: String, default: '' },
  },
  { _id: false }
)

/**
 * Una entrada del historial de estados.
 *
 * El pedido guarda `estado` (dónde está AHORA) y este array (cómo llegó). Sin
 * el segundo no hay línea de tiempo posible y tampoco se puede responder
 * "¿quién canceló esto y cuándo?", que es la pregunta que siempre aparece.
 *
 * `usuario` es opcional porque el estado inicial lo pone el sistema al crear
 * el pedido, no una acción de nadie.
 */
const orderStatusEntrySchema = new mongoose.Schema(
  {
    estado: { type: String, enum: ESTADOS_PEDIDO, required: true },
    fecha: { type: Date, default: Date.now },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    /** Rol de quien hizo el cambio, congelado en el momento del cambio. */
    rol: { type: String, default: 'sistema' },
    nota: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false }
)

/** Datos del despacho. Todo opcional: el admin puede despachar sin tracking. */
const seguimientoSchema = new mongoose.Schema(
  {
    numero: { type: String, trim: true, maxlength: 80, default: '' },
    transportista: { type: String, trim: true, maxlength: 80, default: '' },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: 'El pedido debe contener al menos un producto',
      },
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'El total no puede ser negativo'],
    },
    estado: {
      type: String,
      enum: ESTADOS_PEDIDO,
      default: ESTADO_PEDIDO_INICIAL,
    },
    historialEstados: {
      type: [orderStatusEntrySchema],
      default: [],
    },
    seguimiento: {
      type: seguimientoSchema,
      default: () => ({}),
    },
    /**
     * ────────────────────────────────────────────────────────────────────
     * EL CERROJO CONTRA LA DOBLE DEVOLUCIÓN DE STOCK.
     * ────────────────────────────────────────────────────────────────────
     * Cancelar devuelve unidades a la góndola. Si esa operación corre dos
     * veces —doble click, reintento del cliente HTTP, dos pestañas abiertas—
     * el inventario se infla con stock que no existe, y eso después se vende.
     *
     * La protección real es el `findOneAndUpdate` condicional del controller,
     * que solo gana una vez. Esta fecha es el segundo cerrojo y la evidencia:
     * si tiene valor, las unidades YA volvieron, y también dice cuándo.
     */
    stockDevueltoAt: { type: Date, default: null },
    canceladoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    motivoCancelacion: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    direccionEnvio: {
      type: String,
      required: [true, 'La dirección de envío es obligatoria'],
      trim: true,
      maxlength: [300, 'La dirección no puede superar los 300 caracteres'],
    },
    notas: {
      type: String,
      trim: true,
      maxlength: [500, 'Las notas no pueden superar los 500 caracteres'],
      default: '',
    },
  },
  { timestamps: true }
)

// El listado "mis pedidos" filtra por usuario y ordena por fecha:
// este índice compuesto cubre exactamente esa consulta.
orderSchema.index({ usuario: 1, createdAt: -1 })
orderSchema.index({ estado: 1, createdAt: -1 })

orderSchema.virtual('cantidadTotal').get(function cantidadTotal() {
  return this.items.reduce((total, item) => total + item.cantidad, 0)
})

orderSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v
    return ret
  },
})
orderSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Order', orderSchema)
