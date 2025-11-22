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

// Conexión a MongoDB
async function start() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    console.warn('MONGO_URI no configurada. El backend arrancará pero sin persistencia (use mock en frontend).')
    app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT} (sin DB)`))
    return
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log('Conectado a MongoDB')
    app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`))
  } catch (err) {
    console.error('Error conectando a MongoDB:', err.message)
    process.exit(1)
  }
}

start()
