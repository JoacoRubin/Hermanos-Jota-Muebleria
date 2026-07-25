const rateLimit = require('express-rate-limit')
const { env } = require('../config')

const jsonMessage = (message) => ({ message })

/**
 * Límites por IP. Los de autenticación son deliberadamente agresivos:
 * sin esto, `POST /login` acepta intentos ilimitados y un diccionario básico
 * entra contra cualquier contraseña de 6 caracteres.
 */
function createRateLimiters({ enabled = true } = {}) {
  const base = {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // En tests el límite convierte los asserts en una lotería.
    skip: () => !enabled,
  }

  return {
    // Límite general para toda la API.
    general: rateLimit({
      ...base,
      windowMs: 15 * 60 * 1000,
      limit: 300,
      message: jsonMessage(
        'Demasiadas peticiones. Esperá unos minutos e intentá de nuevo.'
      ),
    }),

    // Login y registro: la superficie de fuerza bruta.
    auth: rateLimit({
      ...base,
      windowMs: 15 * 60 * 1000,
      limit: 10,
      // Un login exitoso no cuenta: el objetivo son los intentos fallidos.
      skipSuccessfulRequests: true,
      message: jsonMessage(
        'Demasiados intentos fallidos. Esperá 15 minutos e intentá de nuevo.'
      ),
    }),

    // Escrituras autenticadas (crear pedidos, alta de productos).
    write: rateLimit({
      ...base,
      windowMs: 60 * 1000,
      limit: 30,
      message: jsonMessage('Demasiadas operaciones seguidas. Esperá un momento.'),
    }),

    // Formulario de contacto: público y sin sesión, o sea, imán de spam.
    contact: rateLimit({
      ...base,
      windowMs: 60 * 60 * 1000,
      limit: 5,
      message: jsonMessage(
        'Ya enviaste varias consultas. Esperá una hora antes de mandar otra.'
      ),
    }),

    // Asistente (RAG): público y cada pregunta cuesta una llamada a un LLM.
    // Más holgado que contacto (es conversacional) pero acotado para no quemar
    // la cuota gratis del modelo.
    asistente: rateLimit({
      ...base,
      windowMs: 5 * 60 * 1000,
      limit: 20,
      message: jsonMessage(
        'Estás consultando muy seguido al asistente. Esperá unos minutos.'
      ),
    }),
  }
}

const limiters = createRateLimiters({ enabled: !env.isTest })

module.exports = { limiters, createRateLimiters }
