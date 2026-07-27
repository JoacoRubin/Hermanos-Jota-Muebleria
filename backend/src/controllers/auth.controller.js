const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const PasswordResetToken = require('../models/PasswordResetToken')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { serializeUser } = require('../serializers')
const { env, tokens, mailer } = require('../config')
const { mailRecuperacion } = require('../services/mailer')
const { REFRESH_COOKIE_NAME, hashToken } = require('../utils/tokens')

// Máximo de sesiones simultáneas por usuario (una entrada por dispositivo).
const MAX_SESIONES = 5

/**
 * Hash de descarte para igualar el tiempo de respuesta cuando el email no
 * existe. Sin esto, el login responde notoriamente más rápido para emails
 * inexistentes y eso permite enumerar qué cuentas están registradas.
 */
const DUMMY_HASH = bcrypt.hashSync('timing-attack-mitigation', 12)

async function registrarSesion(userId, { jti, token, expiresAt }) {
  // Se limpian las sesiones vencidas antes de agregar la nueva.
  // Van en dos operaciones porque MongoDB no admite `$pull` y `$push`
  // sobre el mismo campo en un solo update.
  await User.updateOne(
    { _id: userId },
    { $pull: { refreshTokens: { expiresAt: { $lte: new Date() } } } }
  )

  await User.updateOne(
    { _id: userId },
    {
      $push: {
        refreshTokens: {
          $each: [{ jti, tokenHash: tokens.hashToken(token), expiresAt }],
          $slice: -MAX_SESIONES,
        },
      },
    }
  )
}

/** Emite el par de tokens y deja el refresh token en una cookie httpOnly. */
async function emitirSesion(res, user) {
  const accessToken = tokens.signAccessToken(user)
  const refresh = tokens.signRefreshToken(user)

  await registrarSesion(user._id, refresh)
  tokens.setRefreshCookie(res, refresh.token)

  return accessToken
}

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Público
exports.register = asyncHandler(async (req, res) => {
  const { nombre, email, password } = req.body

  const existingUser = await User.findOne({ email }).lean()
  if (existingUser) {
    throw ApiError.conflict('El email ya está registrado')
  }

  // `role` no se lee del body a propósito: siempre queda el default ('user').
  // Un usuario nunca puede autoascenderse en el registro.
  const user = await User.create({ nombre, email, password })

  const accessToken = await emitirSesion(res, user)

  res.status(201).json({
    message: 'Usuario registrado exitosamente',
    data: { accessToken, user: serializeUser(user) },
  })
})

// @desc    Login
// @route   POST /api/auth/login
// @access  Público
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+password')

  if (!user) {
    // Se compara igual contra un hash de descarte para que el tiempo de
    // respuesta no delate si el email existe.
    await bcrypt.compare(password, DUMMY_HASH)
    throw ApiError.unauthorized('Credenciales inválidas')
  }

  const passwordValida = await user.comparePassword(password)
  if (!passwordValida) {
    // Mismo mensaje que arriba: nunca se distingue "email inexistente" de
    // "contraseña incorrecta".
    throw ApiError.unauthorized('Credenciales inválidas')
  }

  const accessToken = await emitirSesion(res, user)

  res.json({
    message: 'Login exitoso',
    data: { accessToken, user: serializeUser(user) },
  })
})

// @desc    Renovar el access token usando la cookie de refresh
// @route   POST /api/auth/refresh
// @access  Público (autenticado por cookie httpOnly)
exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME]

  if (!token) {
    throw ApiError.unauthorized('No hay sesión activa')
  }

  let payload
  try {
    payload = tokens.verifyRefreshToken(token)
  } catch (error) {
    tokens.clearRefreshCookie(res)
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('La sesión expiró. Iniciá sesión de nuevo.')
    }
    throw ApiError.unauthorized('Sesión inválida')
  }

  const user = await User.findById(payload.sub).select('+refreshTokens')
  if (!user) {
    tokens.clearRefreshCookie(res)
    throw ApiError.unauthorized('Sesión inválida')
  }

  const tokenHash = tokens.hashToken(token)
  const sesion = user.refreshTokens.find(
    (entry) => entry.jti === payload.jti && entry.tokenHash === tokenHash
  )

  if (!sesion) {
    // El token está firmado y no venció, pero ya no figura en la base:
    // o se usó una vez y fue rotado, o alguien lo robó. En cualquiera de los
    // dos casos se revocan TODAS las sesiones del usuario. Es la detección
    // de reutilización, y es lo que convierte un token robado en un
    // incidente de minutos en vez de días.
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } })
    tokens.clearRefreshCookie(res)
    throw ApiError.unauthorized(
      'Sesión inválida. Por seguridad se cerraron todas las sesiones.'
    )
  }

  // Rotación: el refresh token usado se invalida y se emite uno nuevo.
  await User.updateOne(
    { _id: user._id },
    { $pull: { refreshTokens: { jti: payload.jti } } }
  )

  const accessToken = await emitirSesion(res, user)

  res.json({
    message: 'Sesión renovada',
    data: { accessToken, user: serializeUser(user) },
  })
})

// @desc    Cerrar sesión (revoca el refresh token actual)
// @route   POST /api/auth/logout
// @access  Público (idempotente)
exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME]

  if (token) {
    try {
      const payload = tokens.verifyRefreshToken(token)
      await User.updateOne(
        { _id: payload.sub },
        { $pull: { refreshTokens: { jti: payload.jti } } }
      )
    } catch {
      // Un token ilegible ya no sirve para nada: no hay nada que revocar.
    }
  }

  tokens.clearRefreshCookie(res)
  res.json({ message: 'Sesión cerrada' })
})

// @desc    Perfil del usuario autenticado
// @route   GET /api/auth/profile
// @access  Privado
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw ApiError.notFound('Usuario no encontrado')

  res.json({ data: { user: serializeUser(user) } })
})

// @desc    Verificar el access token actual
// @route   GET /api/auth/verify
// @access  Privado
exports.verifyToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw ApiError.unauthorized('Usuario no encontrado')

  res.json({ data: { valid: true, user: serializeUser(user) } })
})

// ═══════════════════════════════════════════════════════════════════════════
// RECUPERACIÓN DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mensaje idéntico exista o no la cuenta.
 *
 * Es UNA sola constante y no dos strings iguales escritos en dos ramas: si
 * fueran dos, un día alguien retoca uno y la diferencia vuelve a delatar qué
 * emails están registrados. La constante hace que la propiedad de seguridad
 * sea imposible de romper por descuido.
 */
const RESPUESTA_RECUPERACION =
  'Si el email corresponde a una cuenta registrada, te enviamos un link para ' +
  'restablecer la contraseña. Revisá tu bandeja de entrada y el correo no deseado.'

/**
 * Genera el token que viaja en el link.
 *
 * 32 bytes de `randomBytes` = 256 bits de entropía. No es adivinable por
 * fuerza bruta ni predecible: `Math.random()` acá sería un agujero, porque su
 * generador no es criptográfico y su estado se puede reconstruir observando
 * unas pocas salidas.
 *
 * `base64url` en vez de `hex`: mismo contenido, string más corto, y sin
 * caracteres que se rompan al pegarlos en una URL.
 */
function generarTokenRecuperacion() {
  return crypto.randomBytes(32).toString('base64url')
}

// @desc    Pedir un link para restablecer la contraseña
// @route   POST /api/auth/forgot-password
// @access  Público (con rate limit)
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body

  const user = await User.findOne({ email })

  // ────────────────────────────────────────────────────────────────────────
  // NO SE REVELA SI LA CUENTA EXISTE.
  //
  // Un 404 acá convierte este endpoint en un oráculo de enumeración: probás
  // mil emails, anotás cuáles dan 200, y ya tenés la lista de clientes de la
  // mueblería. Sirve para phishing dirigido y para credential stuffing.
  //
  // Así que cuando el email no existe se sale por el MISMO return, con el
  // MISMO texto. Desde afuera los dos casos son indistinguibles.
  // ────────────────────────────────────────────────────────────────────────
  if (!user) {
    return res.json({ message: RESPUESTA_RECUPERACION })
  }

  // Un pedido nuevo invalida los anteriores. Si alguien pide tres links y usa
  // el primero, los otros dos no deberían seguir sirviendo: son llaves de la
  // misma cerradura circulando por ahí.
  await PasswordResetToken.updateMany(
    { usuario: user._id, usedAt: null },
    { $set: { usedAt: new Date() } }
  )

  const token = generarTokenRecuperacion()
  const minutos = env.PASSWORD_RESET_TTL_MINUTES

  await PasswordResetToken.create({
    usuario: user._id,
    // Se guarda el HASH. Si mañana se filtra la base, esa columna no sirve
    // para entrar a ninguna cuenta: del hash no se vuelve al token.
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + minutos * 60 * 1000),
    solicitadoDesde: req.ip || '',
  })

  const link = `${env.appUrl}/restablecer-password?token=${token}`

  const { asunto, texto } = mailRecuperacion({
    nombre: user.nombre.split(' ')[0],
    link,
    minutos,
  })

  // Un fallo del proveedor de mail NO puede cambiar la respuesta: si el error
  // se propagara, un 500 para un email existente y un 200 para uno inexistente
  // volverían a delatar cuáles están registrados. Se loguea y se sigue.
  try {
    await mailer.enviar({ para: user.email, asunto, texto })
  } catch (error) {
    console.error('[auth] Falló el envío del mail de recuperación:', error.message)
  }

  res.json({ message: RESPUESTA_RECUPERACION })
})

// @desc    Definir una contraseña nueva con el token del mail
// @route   POST /api/auth/reset-password
// @access  Público (con rate limit)
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body

  // Se busca por hash: el token en claro nunca estuvo en la base, así que la
  // única forma de encontrarlo es rehashear lo que trajo el usuario.
  const registro = await PasswordResetToken.findOne({
    tokenHash: hashToken(token),
  })

  const ahora = new Date()

  /**
   * Un solo mensaje para las tres formas de fallar —no existe, ya se usó,
   * venció— y un solo status.
   *
   * Distinguir "este token ya se usó" de "este token no existe" le confirma a
   * quien tenga un link viejo que ese link fue real y de quién. No hay nada
   * que el usuario legítimo pueda hacer distinto según el caso: en los tres
   * la acción es pedir un link nuevo.
   */
  const invalido = () =>
    ApiError.badRequest(
      'El link no es válido o ya venció. Pedí uno nuevo desde "Olvidé mi contraseña".'
    )

  if (!registro) throw invalido()
  if (registro.usedAt) throw invalido()
  if (registro.expiresAt <= ahora) throw invalido()

  const user = await User.findById(registro.usuario).select('+refreshTokens')
  if (!user) throw invalido()

  // ────────────────────────────────────────────────────────────────────────
  // EL CONSUMO VA PRIMERO, Y ES CONDICIONAL.
  //
  // `usedAt: null` dentro del filtro hace que dos requests simultáneos con el
  // mismo token no puedan ganar los dos: uno matchea, el otro recibe `null`.
  // Mismo patrón que el claim de la cancelación de pedidos.
  //
  // Y va ANTES de cambiar la contraseña a propósito: si algo falla después,
  // el token queda quemado igual. Un token que sobrevive a un error es un
  // token reutilizable.
  // ────────────────────────────────────────────────────────────────────────
  const consumido = await PasswordResetToken.findOneAndUpdate(
    { _id: registro._id, usedAt: null },
    { $set: { usedAt: ahora } }
  )

  if (!consumido) throw invalido()

  user.password = password // el hook pre('save') lo hashea
  user.passwordChangedAt = ahora

  /**
   * Se cierran TODAS las sesiones abiertas.
   *
   * Es el punto del flujo, no un extra. El caso de uso real de "olvidé mi
   * contraseña" incluye "me robaron la cuenta": si el atacante tiene un
   * refresh token vigente, cambiar la contraseña sin revocar sesiones no lo
   * echa de ningún lado y sigue adentro siete días más.
   */
  user.refreshTokens = []
  await user.save()

  // La sesión del propio navegador también muere: la cookie que quedó apunta
  // a un refresh token que ya no existe.
  tokens.clearRefreshCookie(res)

  res.json({
    message:
      'Contraseña actualizada. Por seguridad se cerraron todas las sesiones: ' +
      'iniciá sesión con tu contraseña nueva.',
  })
})
