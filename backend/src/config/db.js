const mongoose = require('mongoose')

const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
}

function registerConnectionEvents(logger = console) {
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB desconectado')
  })

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconectado')
  })

  mongoose.connection.on('error', (err) => {
    logger.error('Error en la conexión de MongoDB:', err.message)
  })
}

async function connectDatabase(uri, logger = console) {
  const startedAt = Date.now()
  await mongoose.connect(uri, CONNECTION_OPTIONS)
  logger.info(`Conectado a MongoDB en ${Date.now() - startedAt}ms`)
  return mongoose.connection
}

async function disconnectDatabase() {
  await mongoose.disconnect()
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  registerConnectionEvents,
  CONNECTION_OPTIONS,
}
