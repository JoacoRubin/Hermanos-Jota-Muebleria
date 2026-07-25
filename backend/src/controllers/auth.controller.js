const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { serializeUser } = require('../serializers')
const { tokens } = require('../config')
const { REFRESH_COOKIE_NAME } = require('../utils/tokens')

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

exports.MAX_SESIONES = MAX_SESIONES
