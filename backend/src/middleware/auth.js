const jwt = require('jsonwebtoken')
const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const { tokens } = require('../config')

/**
 * Exige un access token válido y carga el usuario en `req.user`.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No autorizado. Token no proporcionado.')
    }

    const token = authHeader.slice('Bearer '.length).trim()
    if (!token) {
      throw ApiError.unauthorized('No autorizado. Token no proporcionado.')
    }

    const payload = tokens.verifyAccessToken(token)
    const user = await User.findById(payload.sub)

    if (!user) {
      throw ApiError.unauthorized('No autorizado. Usuario no encontrado.')
    }

    req.user = {
      // `.toString()` no es cosmético: `_id` es un ObjectId, y compararlo con
      // `!==` contra un string da siempre `true`. Ese era el bug que hacía que
      // GET /api/orders/:id devolviera 403 hasta al dueño del pedido.
      id: user._id.toString(),
      nombre: user.nombre,
      email: user.email,
      role: user.role,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized('Token expirado'))
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(ApiError.unauthorized('Token inválido'))
    }
    next(error)
  }
}

/**
 * Exige uno de los roles indicados. Se usa SIEMPRE después de `authMiddleware`.
 */
function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return next(
        ApiError.unauthorized('No autorizado. Debe iniciar sesión primero.')
      )
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          'Acceso denegado. Se requieren permisos de administrador.'
        )
      )
    }

    next()
  }
}

const adminMiddleware = requireRole('admin')

module.exports = { authMiddleware, requireRole, adminMiddleware }
