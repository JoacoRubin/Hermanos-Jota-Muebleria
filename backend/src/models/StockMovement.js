const mongoose = require('mongoose')
const { MOTIVOS_MOVIMIENTO_STOCK } = require('../constants')

/**
 * Libro mayor del inventario: una fila por cada vez que el stock se movió.
 *
 * Es append-only. Nada lo edita ni lo borra; corregir un error se hace con un
 * movimiento nuevo de signo contrario. Un registro que se puede reescribir no
 * sirve para auditar, porque justamente lo que se quiere auditar es a quien
 * tiene permiso para reescribirlo.
 *
 * `cantidad` va CON SIGNO: positiva suma unidades (reposición, cancelación),
 * negativa las resta (venta). Así el saldo de un producto es literalmente la
 * suma de su columna, y un descuadre entre eso y `Product.stock` es detectable.
 */
const stockMovementSchema = new mongoose.Schema(
  {
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    // Snapshot del nombre: si el producto se borra, el movimiento histórico
    // tiene que seguir siendo legible. Mismo criterio que los ítems del pedido.
    nombreProducto: { type: String, required: true },
    cantidad: {
      type: Number,
      required: true,
      validate: {
        validator: (valor) => Number.isInteger(valor) && valor !== 0,
        message: 'La cantidad debe ser un entero distinto de cero',
      },
    },
    motivo: {
      type: String,
      enum: {
        values: MOTIVOS_MOVIMIENTO_STOCK,
        message: 'Motivo de movimiento inválido: {VALUE}',
      },
      required: true,
    },
    /**
     * Quién lo provocó. Opcional a propósito: hay movimientos sin sesión
     * humana detrás (un seed, un script de migración). `null` es un dato
     * honesto; inventar un usuario sería peor.
     */
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pedido: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    /** Stock que quedó DESPUÉS del movimiento. Permite reconstruir la serie. */
    stockResultante: {
      type: Number,
      required: true,
      min: [0, 'El stock resultante no puede ser negativo'],
    },
    nota: {
      type: String,
      trim: true,
      maxlength: [200, 'La nota no puede superar los 200 caracteres'],
      default: '',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// El historial siempre se consulta por producto y en orden cronológico inverso.
stockMovementSchema.index({ producto: 1, createdAt: -1 })
stockMovementSchema.index({ createdAt: -1 })

stockMovementSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v
    return ret
  },
})

module.exports = mongoose.model('StockMovement', stockMovementSchema)
