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
 * Igual que `authMiddleware`, pero NO exige nada: si hay un token válido carga
 * `req.user`, y si no lo hay sigue de largo con `req.user` en `undefined`.
 *
 * Existe por el catálogo. `GET /api/productos` es público —tiene que serlo,
 * es la vidriera— pero el admin usa exactamente el mismo endpoint desde su
 * panel, y él SÍ necesita ver el stock exacto. Duplicar la ruta en
 * `/api/admin/productos` sería duplicar el filtrado, la paginación y la
 * búsqueda; que es como se desincronizan las cosas.
 *
 * Un token roto acá NO es un error: es un visitante anónimo. Cualquier otra
 * decisión convertiría una cookie vieja en una página caída.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) return next()

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return next()

  try {
    const payload = tokens.verifyAccessToken(token)
    const user = await User.findById(payload.sub)

    if (user) {
      req.user = {
        id: user._id.toString(),
        nombre: user.nombre,
        email: user.email,
        role: user.role,
      }
    }
  } catch {
    // Token vencido, inválido o usuario borrado: se sigue como anónimo.
  }

  next()
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

/**
 * Cierra la ruta a las cuentas de administración. Se usa después de
 * `authMiddleware`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO ES `requireRole('user')`
 * ────────────────────────────────────────────────────────────────────────────
 * Funcionaría hoy, porque `ROLES` tiene exactamente dos valores. Pero el día
 * que aparezca un tercer rol —`vendedor`, `deposito`— `requireRole('user')` lo
 * dejaría afuera de comprar sin que nadie lo haya decidido. La regla real no es
 * "solo los user": es "los admin no". Se escribe la que es.
 *
 * Además el mensaje de `requireRole` habla de permisos de administrador, que
 * acá sería exactamente al revés: al admin le sobra rol, no le falta.
 */
function bloquearAdmins(req, res, next) {
  if (!req.user) {
    return next(
      ApiError.unauthorized('No autorizado. Debe iniciar sesión primero.')
    )
  }

  if (req.user.role === 'admin') {
    return next(
      ApiError.forbidden(
        'Las cuentas de administración no pueden comprar. Ingresá con una cuenta de cliente.'
      )
    )
  }

  next()
}

// Se eliminó `adminMiddleware = requireRole('admin')`: era un alias que no
// usaba ninguna ruta —todas llaman a `requireRole('admin')` directo— y tener
// dos formas de pedir lo mismo invita a que mañana solo una se actualice.
module.exports = { authMiddleware, optionalAuth, requireRole, bloquearAdmins }
