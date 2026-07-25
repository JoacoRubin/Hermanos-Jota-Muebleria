const mongoose = require('mongoose')
const { ESTADOS_CONSULTA } = require('../constants')

/**
 * Consulta enviada desde el formulario de contacto.
 *
 * Se persiste en lugar de enviarse por mail porque el proyecto no tiene (todavía)
 * un proveedor de correo configurado. Guardarlo es honesto y reversible: el día
 * que haya un SendGrid/Resend, se agrega el envío en el controller y el resto
 * del flujo queda igual.
 */
const contactMessageSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    mensaje: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    estado: {
      type: String,
      enum: ESTADOS_CONSULTA,
      default: 'nueva',
    },
  },
  { timestamps: true }
)

contactMessageSchema.index({ estado: 1, createdAt: -1 })
contactMessageSchema.index({ createdAt: -1 })

module.exports = mongoose.model('ContactMessage', contactMessageSchema)
