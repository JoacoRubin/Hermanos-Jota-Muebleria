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
  }
}

module.exports = { loadEnv, envSchema, DEV_ORIGINS }
