require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const productosRoutes = require('./routes/productos.routes')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Prefijo API
app.use('/api/productos', productosRoutes)

app.get('/', (req, res) => {
  res.send('<h1>Bienvenido a la API de Mueblería Jota</h1><p>Endpoints disponibles:</p><ul><li><a href="/api/productos">/api/productos</a></li></ul>');
});

// Error handler simple
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: err.message || 'Internal Server Error' })
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
