const ApiError = require('../utils/ApiError')

/**
 * Valida una parte del request contra un schema de zod y **reemplaza** el
 * valor original por el resultado parseado.
 *
 * Esto es lo que elimina de raíz el mass assignment: después de este
 * middleware `req.body` contiene únicamente los campos declarados en el
 * schema, ya casteados. Lo que el cliente mande de más, no existe.
 */
function validate(schema, source = 'body') {
  return function validateRequest(req, res, next) {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }))
      return next(ApiError.badRequest('Datos inválidos', details))
    }

    // `req.query` y `req.params` son getters en Express 4: no se pueden
    // reasignar, así que el resultado se guarda en un espacio propio.
    if (source === 'body') {
      req.body = result.data
    } else {
      req.validated = { ...req.validated, [source]: result.data }
    }

    next()
  }
}

/** Atajo para leer datos validados sin importar de dónde vengan. */
function validated(req, source) {
  if (source === 'body') return req.body
  return req.validated?.[source] ?? {}
}

module.exports = { validate, validated }
