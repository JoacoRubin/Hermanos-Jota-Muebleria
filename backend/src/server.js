require('dotenv').config()

const {
  connectDatabase,
  disconnectDatabase,
  registerConnectionEvents,
} = require('./config/db')

async function main() {
  // Los require van DENTRO de `main` a propósito.
  //
  // `./config` valida el entorno y lanza si falta algo crítico, y `./app` lo
  // requiere en su primera línea. Si los importáramos arriba, el error saltaría
  // durante la carga del módulo —antes de que exista el catch de abajo— y el
  // usuario vería un stack trace crudo en vez de la lista de variables que
  // le faltan.
  const { env } = require('./config')
  const { createApp } = require('./app')

  registerConnectionEvents()
  await connectDatabase(env.MONGO_URI)

  const app = createApp()
  const server = app.listen(env.PORT, () => {
    console.log(`Servidor escuchando en el puerto ${env.PORT} [${env.NODE_ENV}]`)
    console.log(`Health check: http://localhost:${env.PORT}/health`)
    console.log(`Orígenes CORS permitidos: ${env.corsOrigins.join(', ') || '(ninguno)'}`)
  })

  // Apagado ordenado: se dejan terminar las peticiones en curso antes de
  // cerrar la conexión a Mongo. Render manda SIGTERM en cada deploy.
  const shutdown = async (signal) => {
    console.log(`${signal} recibido, cerrando servidor...`)
    server.close(async () => {
      await disconnectDatabase()
      console.log('Servidor cerrado correctamente')
      process.exit(0)
    })

    // Si algo queda colgado, no esperamos para siempre.
    setTimeout(() => {
      console.error('Cierre forzado tras 10s de espera')
      process.exit(1)
    }, 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((error) => {
  console.error('\nNo se pudo iniciar el servidor:\n')
  console.error(error.message)
  process.exit(1)
})
