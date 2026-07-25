const request = require('supertest')

/**
 * Crea un usuario a través de la API y devuelve su access token.
 * Pasa por el flujo real: si el registro se rompe, los tests lo gritan.
 */
async function registrarUsuario(app, overrides = {}) {
  const payload = {
    nombre: 'Usuario Test',
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@ejemplo.com`,
    password: 'password123',
    ...overrides,
  }

  const res = await request(app).post('/api/auth/register').send(payload)

  if (res.status !== 201) {
    throw new Error(
      `No se pudo registrar el usuario de prueba: ${res.status} ${JSON.stringify(res.body)}`
    )
  }

  return {
    token: res.body.data.accessToken,
    user: res.body.data.user,
    password: payload.password,
    cookies: res.headers['set-cookie'],
  }
}

/**
 * Crea un admin. Se hace directo contra el modelo a propósito: la API NUNCA
 * permite elegir el rol, y ese es justamente uno de los comportamientos que
 * los tests verifican.
 */
async function crearAdmin(app) {
  const User = require('../../src/models/User')

  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@ejemplo.com`
  const password = 'adminpass123'

  await User.create({
    nombre: 'Admin Test',
    email,
    password,
    role: 'admin',
  })

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })

  return { token: res.body.data.accessToken, user: res.body.data.user }
}

async function crearProducto(overrides = {}) {
  const Product = require('../../src/models/Product')

  return Product.create({
    nombre: 'Silla de Prueba',
    descripcion: 'Una silla para tests',
    precio: 1000,
    stock: 5,
    categoria: 'Sillas',
    imagenUrl: '/images/silla.png',
    ...overrides,
  })
}

module.exports = { registrarUsuario, crearAdmin, crearProducto }
