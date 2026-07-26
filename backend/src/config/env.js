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

    // Proveedor de mail. `console` imprime el mail en el log del servidor
    // (desarrollo), `noop` lo descarta avisando. Hoy NO hay proveedor real:
    // ver docs/MAIL.md.
    MAIL_DRIVER: z.enum(['console', 'noop']).optional(),
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
  })

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
]

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

    // Base del link de recuperación. En desarrollo cae al Vite local; en
    // producción, al primer origen permitido por CORS, que es el frontend real.
    // Si no hay ninguno configurado queda vacío y el controller lo detecta.
    appUrl: (
      env.APP_URL ||
      (isProduction ? configuredOrigins[0] || '' : 'http://localhost:5173')
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

module.exports = { loadEnv, envSchema, DEV_ORIGINS }
