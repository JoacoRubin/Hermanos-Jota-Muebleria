const mongoose = require('mongoose')
const ApiError = require('../utils/ApiError')

/**
 * 404 para cualquier ruta no registrada. Va SIEMPRE antes del error handler.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  })
}

/**
 * Traduce errores conocidos de Mongoose a respuestas HTTP con sentido,
 * para no filtrar la estructura interna del schema al cliente.
 */
function normalizeError(err) {
  if (err instanceof ApiError) return err

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))
    return ApiError.badRequest('Datos inválidos', details)
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Identificador inválido: ${err.value}`)
  }

  // Índice único violado (por ejemplo, email repetido).
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo'
    return ApiError.conflict(`El ${field} ya está registrado`)
  }

  return err
}

function createErrorHandler({ isProduction, logger = console }) {
  // Express identifica el error handler por su aridad de 4 argumentos:
  // `next` es obligatorio aunque casi nunca se use.
  return function errorHandler(err, req, res, next) {
    const error = normalizeError(err)
    const status = error.status || 500

    if (status >= 500) {
      // Un ApiError 5xx es una condición que previmos (por ejemplo, el RAG
      // caído): su causa real ya se logueó donde ocurrió, así que acá alcanza
      // con una línea. El stack completo se reserva para lo inesperado, que es
      // donde de verdad sirve.
      if (error instanceof ApiError) {
        logger.error(`[${req.method} ${req.originalUrl}] ${error.message}`)
      } else {
        logger.error(`[${req.method} ${req.originalUrl}]`, err)
      }
    }

    if (res.headersSent) return next(err)

    // Los mensajes internos (stack, errores de driver, paths del schema) solo
    // se exponen si el error fue creado deliberadamente para el cliente.
    const message = error.expose
      ? error.message
      : 'Error interno del servidor'

    const body = { message }
    if (error.details) body.errors = error.details
    if (!isProduction && status >= 500) body.stack = err.stack

    res.status(status).json(body)
  }
}

module.exports = { notFoundHandler, createErrorHandler, normalizeError }
