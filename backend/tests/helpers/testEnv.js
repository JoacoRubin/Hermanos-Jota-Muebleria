const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

let mongod

/**
 * Levanta un MongoDB en memoria y construye la app.
 *
 * El orden importa: las variables de entorno se setean ANTES del primer
 * `require('../../src/app')`, porque `src/config` valida el entorno en el
 * momento del require y cachea el resultado.
 */
async function setupTestApp() {
  mongod = await MongoMemoryServer.create()

  process.env.NODE_ENV = 'test'
  process.env.MONGO_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-access-secret-de-al-menos-32-caracteres'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-distinto-y-de-32-chars'
  process.env.ACCESS_TOKEN_TTL = '15m'
  process.env.REFRESH_TOKEN_TTL_DAYS = '7'
  process.env.CORS_ORIGINS = 'http://localhost:3000'

  await mongoose.connect(process.env.MONGO_URI)

  const { createApp } = require('../../src/app')
  return createApp()
}

async function teardownTestApp() {
  await mongoose.disconnect()
  if (mongod) await mongod.stop()
}

/** Deja la base limpia entre tests para que no se contaminen entre sí. */
async function clearDatabase() {
  const { collections } = mongoose.connection
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  )
}

module.exports = { setupTestApp, teardownTestApp, clearDatabase }
