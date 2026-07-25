/**
 * Error con status HTTP explícito.
 *
 * Sirve para distinguir los errores que el cliente puede ver (400/403/404…)
 * de los que no (bugs, fallos de infraestructura). Todo lo que no sea un
 * ApiError se trata como 500 y su mensaje nunca sale al cliente en producción.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.expose = true
    if (details) this.details = details
    Error.captureStackTrace?.(this, ApiError)
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details)
  }

  static unauthorized(message = 'No autorizado') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'Acceso denegado') {
    return new ApiError(403, message)
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message)
  }

  static conflict(message, details) {
    return new ApiError(409, message, details)
  }
}

module.exports = ApiError
