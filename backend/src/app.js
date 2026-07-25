const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')

const { env } = require('./config')
const ApiError = require('./utils/ApiError')
const { createMongoSanitizer } = require('./middleware/sanitize')
const { limiters } = require('./middleware/rateLimit')
const {
  notFoundHandler,
  createErrorHandler,
} = require('./middleware/errorHandler')

const productosRoutes = require('./routes/productos.routes')
const authRoutes = require('./routes/auth.routes')
const ordersRoutes = require('./routes/orders.routes')
const contactRoutes = require('./routes/contact.routes')
const asistenteRoutes = require('./routes/asistente.routes')

function createApp() {
  const app = express()

  // Render (y cualquier PaaS) pone un proxy delante. Sin esto, el rate
  // limiter ve siempre la IP del proxy y limita a todos los usuarios como
  // si fueran uno solo. El `1` significa "confiá en un único proxy":
  // `true` permitiría falsear la IP con un header X-Forwarded-For.
  app.set('trust proxy', 1)

  app.disable('x-powered-by')

  // Cabeceras de seguridad (HSTS, X-Content-Type-Options, frameguard, etc.).
  app.use(
    helmet({
      // La API sirve JSON, no HTML: la CSP la aplica el hosting del frontend.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  )

  // ── CORS ────────────────────────────────────────────────────────────────
  // La versión anterior tenía una whitelist decorativa: la rama `else`
  // llamaba igual a `callback(null, true)`, así que aceptaba cualquier
  // origen. Esto sí rechaza.
  app.use(
    cors({
      origin(origin, callback) {
        // Sin `Origin` = no es una petición de navegador (curl, health check,
        // apps móviles). CORS no aplica y no hay nada que proteger acá.
        if (!origin) return callback(null, true)

        if (env.corsOrigins.includes(origin)) return callback(null, true)

        // Un error pelado saldría como 500. Esto es un rechazo deliberado,
        // y el status tiene que decirlo.
        return callback(ApiError.forbidden(`Origen no permitido: ${origin}`))
      },
      // Necesario para que viaje la cookie httpOnly del refresh token.
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86_400,
    })
  )

  // Techo explícito al tamaño del body: el default de Express son 100kb,
  // pero dejarlo escrito evita sorpresas si mañana alguien lo cambia.
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use(createMongoSanitizer())
  app.use('/api', limiters.general)

  // ── Rutas ───────────────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    const dbConectada = mongoose.connection.readyState === 1
    res.status(dbConectada ? 200 : 503).json({
      status: dbConectada ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      mongodb: dbConectada ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    })
  })

  app.get('/', (req, res) => {
    res.json({
      name: 'API Mueblería Hermanos Jota',
      version: 2,
      endpoints: {
        productos: 'GET /api/productos',
        producto: 'GET /api/productos/:id',
        registro: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        perfil: 'GET /api/auth/profile',
        crearPedido: 'POST /api/orders',
        misPedidos: 'GET /api/orders/mis-pedidos',
        contacto: 'POST /api/contacto',
        asistente: 'POST /api/asistente',
      },
    })
  })

  app.use('/api/productos', productosRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/orders', ordersRoutes)
  app.use('/api/contacto', contactRoutes)
  app.use('/api/asistente', asistenteRoutes)

  // El alias `app.use('/admin/crear-producto', productosRoutes)` se eliminó:
  // montaba el router ENTERO en una segunda URL pública (incluido el DELETE),
  // y el frontend nunca lo usó.

  // ── Cierre de la cadena ─────────────────────────────────────────────────
  // El 404 y el error handler van últimos, siempre y en este orden.
  app.use(notFoundHandler)
  app.use(createErrorHandler({ isProduction: env.isProduction }))

  return app
}

module.exports = { createApp }
