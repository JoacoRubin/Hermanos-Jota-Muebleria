require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const productosRoutes = require('./routes/productos.routes')
const authRoutes = require('./routes/auth.routes')
const ordersRoutes = require('./routes/orders.routes')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Prefijo API
app.use('/api/productos', productosRoutes)
// Alias para ruta de admin
app.use('/admin/crear-producto', productosRoutes)
// Rutas de autenticación
app.use('/api/auth', authRoutes)
// Rutas de pedidos
app.use('/api/orders', ordersRoutes)

app.get('/', (req, res) => {
  res.send('<h1>Bienvenido a la API de Mueblería Jota</h1><p>Endpoints disponibles:</p><ul><li><a href="/api/productos">/api/productos</a></li><li>/api/auth/register (POST)</li><li>/api/auth/login (POST)</li><li>/api/auth/profile (GET)</li><li>/api/orders (POST - Protegido)</li><li>/api/orders/mis-pedidos (GET - Protegido)</li></ul>');
});

// Error handler simple
app.use((err, req, res, next) => {
  console.error('Error:', err)
  
  // Si ya se enviaron los headers, delegar al manejador por defecto
  if (res.headersSent) {
    return next(err)
  }
  
  // Asegurar que siempre se envíe JSON
  res.status(err.status || 500).json({ 
    mensaje: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

// Health check endpoint para mantener el servicio activo
app.get('/health', (req, res) => {
  const status = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  }
  res.json(status)
})

// Conexión a MongoDB con configuración optimizada
async function start() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    console.warn('MONGO_URI no configurada. El backend arrancará pero sin persistencia (use mock en frontend).')
    app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT} (sin DB)`))
    return
  }

  try {
    console.log('Iniciando conexión a MongoDB...')
    const startTime = Date.now()
    
    await mongoose.connect(mongoUri, {
      // Timeouts optimizados
      serverSelectionTimeoutMS: 5000, // 5 segundos para seleccionar servidor
      socketTimeoutMS: 45000, // 45 segundos para operaciones de socket
      
      // Pool de conexiones
      maxPoolSize: 10,
      minPoolSize: 2,
      
      // Heartbeat para mantener conexión
      heartbeatFrequencyMS: 10000,
      
      // Retry
      retryWrites: true,
      retryReads: true
    })
    
    const connectionTime = Date.now() - startTime
    console.log(`✓ Conectado a MongoDB en ${connectionTime}ms`)
    
    app.listen(PORT, () => {
      console.log(`✓ Servidor iniciado en puerto ${PORT}`)
      console.log(`✓ Health check disponible en: http://localhost:${PORT}/health`)
    })
  } catch (err) {
    console.error('✗ Error conectando a MongoDB:', err.message)
    console.error('Detalles:', err)
    process.exit(1)
  }
}

// Manejo de eventos de conexión
mongoose.connection.on('disconnected', () => {
  console.warn('⚠ MongoDB desconectado')
})

mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconectado')
})

mongoose.connection.on('error', (err) => {
  console.error('✗ Error en conexión MongoDB:', err.message)
})

start()
