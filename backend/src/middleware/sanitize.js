/**
 * Defensa en profundidad contra NoSQL / operator injection.
 *
 * MongoDB interpreta como operadores las claves que empiezan con `$`, y usa el
 * punto para navegar campos anidados. Si un atacante manda
 * `{ "email": { "$ne": null } }` o `{ "$rename": {...} }`, esas claves llegan
 * a la query como operadores reales.
 *
 * Mongoose castea los campos tipados y zod valida la forma del payload, pero
 * ninguna de las dos cosas es una barrera pensada para esto. Esta sí.
 *
 * Muta los objetos en su lugar: en Express 4 `req.query` es un getter sin
 * setter, así que reemplazarlo no funciona.
 */

const MAX_DEPTH = 10

function isPlainObject(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !Buffer.isBuffer(value)
  )
}

function isForbiddenKey(key) {
  return key.startsWith('$') || key.includes('.')
}

function sanitizeInPlace(value, depth = 0, onRemoved = () => {}) {
  if (depth > MAX_DEPTH) return

  if (Array.isArray(value)) {
    for (const item of value) sanitizeInPlace(item, depth + 1, onRemoved)
    return
  }

  if (!isPlainObject(value)) return

  for (const key of Object.keys(value)) {
    if (isForbiddenKey(key)) {
      delete value[key]
      onRemoved(key)
      continue
    }
    sanitizeInPlace(value[key], depth + 1, onRemoved)
  }
}

function createMongoSanitizer({ logger = console } = {}) {
  return function sanitizeMongo(req, res, next) {
    const removed = []
    const collect = (key) => removed.push(key)

    for (const source of [req.body, req.query, req.params]) {
      if (source) sanitizeInPlace(source, 0, collect)
    }

    if (removed.length > 0) {
      logger.warn(
        `[sanitize] Claves peligrosas removidas en ${req.method} ${req.originalUrl}: ${removed.join(', ')}`
      )
    }

    next()
  }
}

module.exports = { createMongoSanitizer, sanitizeInPlace }
