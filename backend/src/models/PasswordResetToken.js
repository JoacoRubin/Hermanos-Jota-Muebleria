const mongoose = require('mongoose')

/**
 * Token de un solo uso para restablecer la contraseña.
 *
 * Se guarda el HASH SHA-256, nunca el token en claro. Mismo criterio que los
 * refresh tokens en `User`: si alguien lee un backup de la base, se lleva
 * hashes inservibles y no una llave maestra para entrar a cualquier cuenta.
 *
 * SHA-256 alcanza (no hace falta bcrypt) porque el token es un valor aleatorio
 * de 256 bits: no hay diccionario que lo adivine, así que un hash lento no
 * agrega nada más que latencia.
 *
 * Colección aparte y no un campo en `User` por dos razones concretas:
 *  1. el índice TTL de Mongo borra solo los vencidos, sin cron ni limpieza;
 *  2. la búsqueda es POR TOKEN (el usuario llega con un link, no logueado),
 *     y eso pide un índice sobre `tokenHash`, no sobre el usuario.
 */
const passwordResetTokenSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    /**
     * Marca de consumo. Es lo que hace el token de UN SOLO USO: al canjearlo
     * se sella con la fecha, y el segundo intento con el mismo link encuentra
     * este campo lleno y se rechaza.
     *
     * No se borra la fila al usarla a propósito: un token reutilizado es una
     * señal (link filtrado, reenvío), y borrarlo la haría indistinguible de
     * un token que nunca existió.
     */
    usedAt: { type: Date, default: null },
    /** Contexto para diagnóstico. Nunca se devuelve al cliente. */
    solicitadoDesde: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

/**
 * TTL: Mongo borra el documento cuando `expiresAt` queda en el pasado.
 *
 * Ojo con el matiz: el barrido corre cada ~60s, así que un token vencido puede
 * seguir existiendo un rato. Por eso la validación del vencimiento se hace
 * TAMBIÉN en el controller comparando fechas. Este índice es higiene de la
 * colección, no el control de seguridad.
 */
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema)
