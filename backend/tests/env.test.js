const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { loadEnv, DEV_APP_URL } = require('../src/config/env')

/**
 * Tests puros de configuración: no levantan la app ni la base.
 *
 * Existen porque un default mal elegido no rompe ningún test funcional —todo
 * sigue "andando"— y aparece recién cuando un humano hace click en un link que
 * no lleva a ningún lado.
 */

const BASE = {
  MONGO_URI: 'mongodb://localhost:27017/test',
  JWT_SECRET: 'un-secreto-de-al-menos-32-caracteres-ok',
  JWT_REFRESH_SECRET: 'otro-secreto-distinto-y-de-32-caracteres',
}

test('el default de APP_URL en desarrollo apunta al puerto real de Vite', () => {
  // `client/vite.config.js` fija `server.port: 3000`. El default de fábrica de
  // Vite es 5173, y usar ese haría que el link de recuperación de contraseña
  // apunte a un puerto muerto: la recuperación no se podría probar en local.
  const viteConfig = fs.readFileSync(
    path.join(__dirname, '../../client/vite.config.js'),
    'utf8'
  )

  const match = viteConfig.match(/port:\s*(\d+)/)
  assert.ok(match, 'no se pudo leer el puerto de client/vite.config.js')

  assert.equal(
    DEV_APP_URL,
    `http://localhost:${match[1]}`,
    'DEV_APP_URL quedó desalineado con el puerto que usa el frontend'
  )
})

test('sin APP_URL, en desarrollo se usa el frontend local', () => {
  const env = loadEnv({ ...BASE, NODE_ENV: 'development' })
  assert.equal(env.appUrl, DEV_APP_URL)
})

test('APP_URL explícita gana sobre el default, y se le saca la barra final', () => {
  const env = loadEnv({
    ...BASE,
    NODE_ENV: 'development',
    APP_URL: 'https://hermanosjota.com.ar/',
  })

  assert.equal(env.appUrl, 'https://hermanosjota.com.ar')
})

test('en producción sin APP_URL cae al primer origen de CORS', () => {
  const env = loadEnv({
    ...BASE,
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://hermanosjota.netlify.app,https://otro.com',
  })

  assert.equal(env.appUrl, 'https://hermanosjota.netlify.app')
})

test('el driver de mail NO imprime links en producción', () => {
  // Imprimir un link de recuperación en el log de producción es regalarle
  // acceso a cualquiera que pueda leer los logs.
  const prod = loadEnv({ ...BASE, NODE_ENV: 'production', CORS_ORIGINS: 'https://x.com' })
  assert.equal(prod.mailDriver, 'noop')

  const dev = loadEnv({ ...BASE, NODE_ENV: 'development' })
  assert.equal(dev.mailDriver, 'console')
})

test('todas las variables nuevas son opcionales', () => {
  // El servidor tiene que arrancar sin ninguna de las cuatro que agregamos.
  const env = loadEnv({ ...BASE, NODE_ENV: 'development' })

  assert.equal(env.PASSWORD_RESET_TTL_MINUTES, 60)
  assert.equal(env.RAG_API_KEY, undefined)
  assert.ok(env.appUrl)
  assert.ok(env.mailDriver)
})

test('un TTL de recuperación absurdo se rechaza', () => {
  assert.throws(
    () =>
      loadEnv({
        ...BASE,
        NODE_ENV: 'development',
        PASSWORD_RESET_TTL_MINUTES: '10080', // una semana
      }),
    /PASSWORD_RESET_TTL_MINUTES/
  )
})

test('MAIL_DRIVER=brevo sin credenciales NO deja arrancar', () => {
  // Sin esto el servidor levanta bien y la recuperación falla recién cuando un
  // usuario real la usa — y en silencio, porque el error se traga para no
  // delatar qué cuentas existen.
  assert.throws(
    () => loadEnv({ ...BASE, NODE_ENV: 'development', MAIL_DRIVER: 'brevo' }),
    /BREVO_API_KEY/
  )

  assert.throws(
    () =>
      loadEnv({
        ...BASE,
        NODE_ENV: 'development',
        MAIL_DRIVER: 'brevo',
        BREVO_API_KEY: 'x'.repeat(30),
      }),
    /MAIL_FROM/
  )
})

test('MAIL_DRIVER=brevo bien configurado arranca', () => {
  const env = loadEnv({
    ...BASE,
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://x.com',
    MAIL_DRIVER: 'brevo',
    BREVO_API_KEY: 'x'.repeat(30),
    MAIL_FROM: 'hola@ejemplo.com',
  })

  assert.equal(env.mailDriver, 'brevo')
  assert.equal(env.MAIL_FROM_NOMBRE, 'Mueblería Hermanos Jota')
})

test('una RAG_API_KEY demasiado corta se rechaza en el arranque', () => {
  assert.throws(
    () =>
      loadEnv({ ...BASE, NODE_ENV: 'development', RAG_API_KEY: 'corta' }),
    /RAG_API_KEY/
  )
})
