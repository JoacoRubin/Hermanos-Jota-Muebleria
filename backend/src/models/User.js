const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const SALT_ROUNDS = 12

/**
 * Un refresh token emitido y todavía vigente.
 * Se guarda el HASH, nunca el token: si alguien lee la base, no puede
 * hacerse pasar por nadie.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
)

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [80, 'El nombre no puede superar los 80 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      // Nunca se devuelve por defecto: hay que pedirlo explícitamente
      // con `.select('+password')`, y el único lugar que lo hace es el login.
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
)

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next()

  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS)
    next()
  } catch (error) {
    next(error)
  }
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  // Si el documento se cargó sin `+password` no hay nada que comparar:
  // devolver `false` es más seguro que reventar con un mensaje revelador.
  if (!this.password) return Promise.resolve(false)
  return bcrypt.compare(candidate, this.password)
}

// Red de seguridad: aunque alguien serialice el documento entero,
// los campos sensibles no salen.
userSchema.methods.toJSON = function toJSON() {
  const { password, refreshTokens, __v, ...rest } = this.toObject()
  return rest
}

module.exports = mongoose.model('User', userSchema)
module.exports.SALT_ROUNDS = SALT_ROUNDS
