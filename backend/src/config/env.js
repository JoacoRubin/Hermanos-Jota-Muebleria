const { z } = require('zod')

/**
 * Validación de variables de entorno con fail-fast.
 *
 * Si falta una variable crítica el proceso NO arranca. Es deliberado:
 * un servidor caído se detecta en minutos, uno que arrancó con un secreto
 * por defecto se detecta cuando ya es tarde.
 */
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    PORT: z.coerce.number().int().positive().default(5000),

    MONGO_URI: z.string().min(1, 'MONGO_URI es obligatoria'),

    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),

    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),

    ACCESS_TOKEN_TTL: z.string().default('15m'),

    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

    // Lista separada por comas. Los orígenes de desarrollo se agregan solos
    // cuando NODE_ENV !== 'production'.
    CORS_ORIGINS: z.string().optional(),

    // URL del microservicio RAG (Python) que responde el asistente. Es opcional:
    // si falta, el endpoint /api/asistente devuelve 503 en vez de tumbar el
    // arranque del servidor (el asistente es una función accesoria, no crítica).
    RAG_API_URL: z.string().url().optional(),

    // Secreto compartido con el microservicio RAG. Express lo manda como
    // `Authorization: Bearer …`. Es OPCIONAL y solo sirve de algo si el RAG lo
    // valida del otro lado: si el servicio acepta invocaciones anónimas, todo
    // el rate limiting de esta API se puede saltear pegándole directo.
    RAG_API_KEY: z
      .string()
      .min(16, 'RAG_API_KEY debe tener al menos 16 caracteres')
      .optional(),

    // ── Recuperación de contraseña ──────────────────────────────────────
    // Base del frontend: es lo que se antepone al link del mail de reseteo.
    // Tiene que apuntar al CLIENTE (Netlify), no a la API: el usuario abre una
    // pantalla de React, no un endpoint.
    APP_URL: z.string().url().optional(),

    // Vida del token de recuperación. Una hora es el compromiso habitual:
    // suficiente para que alguien lea el mail sin apuro, corto para que un
    // link filtrado en un historial o un log deje de servir rápido.
    PASSWORD_RESET_TTL_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .max(1440, 'Un token de recuperación no debería durar más de un día')
      .default(60),

    // Proveedor de mail:
    //   console → imprime el mail en el log del servidor (desarrollo)
    //   noop    → lo descarta avisando (default en producción)
    //   brevo   → envía de verdad; requiere BREVO_API_KEY y MAIL_FROM
    // Ver docs/MAIL.md.
    MAIL_DRIVER: z.enum(['console', 'noop', 'brevo']).optional(),

    BREVO_API_KEY: z.string().min(20).optional(),

    // Casilla remitente. Con Brevo tiene que ser una dirección VERIFICADA en
    // el panel (Senders → Add a sender + click en el mail de confirmación).
    // Un Gmail sirve: no hace falta dominio propio.
    MAIL_FROM: z.string().email().optional(),
    MAIL_FROM_NOMBRE: z.string().max(80).default('Mueblería Hermanos Jota'),
  })
  .superRefine((env, ctx) => {
    if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message:
          'JWT_REFRESH_SECRET debe ser distinta de JWT_SECRET (si son iguales, un access token sirve como refresh token)',
      })
    }

    // Fail-fast: con MAIL_DRIVER=brevo pero sin credenciales, el servidor
    // arrancaría bien y el flujo de recuperación fallaría recién cuando un
    // usuario real lo use — y en silencio, porque el error se traga a
    // propósito para no delatar qué cuentas existen. Un arranque roto se
    // detecta en minutos; esto se detectaría con un reclamo.
    if (env.MAIL_DRIVER === 'brevo') {
      if (!env.BREVO_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['BREVO_API_KEY'],
          message: 'MAIL_DRIVER=brevo requiere BREVO_API_KEY',
        })
      }
      if (!env.MAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MAIL_FROM'],
          message:
            'MAIL_DRIVER=brevo requiere MAIL_FROM (una casilla verificada en Brevo)',
        })
      }
    }
  })

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
]

// Dónde corre el frontend en desarrollo. Es el puerto que fija
// `client/vite.config.js`, no el 5173 por defecto de Vite.
const DEV_APP_URL = 'http://localhost:3000'

function loadEnv(source = process.env) {
  const parsed = envSchema.safeParse(source)

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `Configuración de entorno inválida:\n${detalle}\n\n` +
        'Creá tu archivo backend/.env siguiendo docs/DEPLOY.md (sección 1).'
    )
  }

  const env = parsed.data
  const isProduction = env.NODE_ENV === 'production'

  const configuredOrigins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return {
    ...env,
    isProduction,
    isTest: env.NODE_ENV === 'test',
    corsOrigins: isProduction
      ? configuredOrigins
      : [...new Set([...configuredOrigins, ...DEV_ORIGINS])],
    // En desarrollo, por defecto apunta al RAG corriendo local (uvicorn en :8000).
    // En producción hay que setear RAG_API_URL explícitamente.
    ragApiUrl: env.RAG_API_URL || (isProduction ? '' : 'http://localhost:8000'),

    /**
     * Base del link de recuperación de contraseña.
     *
     * El default de desarrollo es el puerto 3000 porque es el que fija
     * `client/vite.config.js` (`server.port: 3000`), NO el 5173 de fábrica de
     * Vite. Si algún día cambia ahí, hay que cambiarlo acá: un desajuste no
     * rompe nada visible, solo hace que el link del mail apunte a un puerto
     * muerto y la recuperación no se pueda probar en local.
     *
     * En producción cae al primer origen permitido por CORS, que es el
     * frontend real. Igual conviene setear APP_URL explícito: el día que
     * alguien agregue un segundo origen al principio de la lista, los links
     * empiezan a apuntar al sitio equivocado sin que nadie se entere.
     */
    appUrl: (
      env.APP_URL ||
      (isProduction ? configuredOrigins[0] || '' : DEV_APP_URL)
    ).replace(/\/$/, ''),

    /**
     * En producción el default es `noop`, NO `console`.
     *
     * Imprimir un link de recuperación de contraseña en el log de producción
     * sería regalar acceso a cualquiera que pueda leer los logs —el panel de
     * Render, un servicio de agregación, un compañero con acceso de lectura—.
     * Un mail que no sale es un problema visible; un token en un log es una
     * puerta abierta que nadie mira.
     */
    mailDriver: env.MAIL_DRIVER || (isProduction ? 'noop' : 'console'),
  }
}

// `envSchema` y `DEV_ORIGINS` no se exportan: solo los usa `loadEnv`, acá
// mismo. `DEV_APP_URL` sí, porque `tests/env.test.js` lo compara contra el
// puerto real de `client/vite.config.js`.
module.exports = { loadEnv, DEV_APP_URL }
