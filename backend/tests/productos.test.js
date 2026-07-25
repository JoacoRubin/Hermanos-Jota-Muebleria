const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const {
  setupTestApp,
  teardownTestApp,
  clearDatabase,
} = require('./helpers/testEnv')
const {
  registrarUsuario,
  crearAdmin,
  crearProducto,
} = require('./helpers/factories')

let app

test.before(async () => {
  app = await setupTestApp()
})

test.after(async () => {
  await teardownTestApp()
})

test.beforeEach(async () => {
  await clearDatabase()
})

// ─────────────────────────────────────────────────────────────────────────────
// Estos cuatro tests son la regresión del hallazgo más grave de la auditoría:
// el CRUD de productos estaba completamente abierto a internet.
// ─────────────────────────────────────────────────────────────────────────────

test('POST /api/productos sin token → 401', async () => {
  const res = await request(app)
    .post('/api/productos')
    .send({ nombre: 'Producto Pirata', precio: 1 })

  assert.equal(res.status, 401)
})

test('PUT /api/productos/:id sin token → 401', async () => {
  const producto = await crearProducto()

  const res = await request(app)
    .put(`/api/productos/${producto._id}`)
    .send({ precio: 1 })

  assert.equal(res.status, 401)
})

test('DELETE /api/productos/:id sin token → 401 y el producto sigue vivo', async () => {
  const producto = await crearProducto()

  const res = await request(app).delete(`/api/productos/${producto._id}`)

  assert.equal(res.status, 401)

  const Product = require('../src/models/Product')
  assert.ok(
    await Product.findById(producto._id),
    'el producto no debe haberse borrado'
  )
})

test('un usuario normal autenticado NO puede crear productos → 403', async () => {
  const { token } = await registrarUsuario(app)

  const res = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${token}`)
    .send({ nombre: 'Producto', precio: 100, categoria: 'Sillas' })

  assert.equal(res.status, 403)
})

test('un admin sí puede crear productos', async () => {
  const { token } = await crearAdmin(app)

  const res = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nombre: 'Mesa Nueva',
      descripcion: 'Una mesa',
      precio: 50000,
      stock: 3,
      categoria: 'Mesas',
      imagenUrl: '/images/mesa.png',
    })

  assert.equal(res.status, 201)
  assert.equal(res.body.data.nombre, 'Mesa Nueva')
  assert.equal(res.body.data.categoria, 'Mesas')
  assert.ok(res.body.data.id)
})

// ─────────────────────────────────────────────────────────────────────────────
// Validación de entrada
// ─────────────────────────────────────────────────────────────────────────────

test('rechaza precio negativo', async () => {
  const { token } = await crearAdmin(app)

  const res = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${token}`)
    .send({ nombre: 'Mesa Gratis', precio: -100, categoria: 'Mesas' })

  assert.equal(res.status, 400)
})

test('rechaza campos no declarados (mass assignment)', async () => {
  const { token } = await crearAdmin(app)

  const res = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nombre: 'Mesa',
      precio: 100,
      categoria: 'Mesas',
      campoInventado: 'no debería entrar',
    })

  assert.equal(res.status, 400)
})

test('neutraliza operadores de MongoDB en el update ($rename)', async () => {
  const { token } = await crearAdmin(app)
  const producto = await crearProducto({ nombre: 'Original' })

  const res = await request(app)
    .put(`/api/productos/${producto._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ $rename: { nombre: 'hackeado' } })

  // El sanitizador borra la clave `$rename`; el body queda vacío y zod
  // rechaza el update por no traer campos válidos.
  assert.equal(res.status, 400)

  const Product = require('../src/models/Product')
  const sinCambios = await Product.findById(producto._id)
  assert.equal(sinCambios.nombre, 'Original')
})

test('el update corre los validadores del schema', async () => {
  const { token } = await crearAdmin(app)
  const producto = await crearProducto()

  const res = await request(app)
    .put(`/api/productos/${producto._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ stock: -5 })

  assert.equal(res.status, 400)
})

test('un id con formato inválido devuelve 400, no 500', async () => {
  const res = await request(app).get('/api/productos/no-es-un-objectid')
  assert.equal(res.status, 400)
})

// ─────────────────────────────────────────────────────────────────────────────
// Lectura pública
// ─────────────────────────────────────────────────────────────────────────────

test('GET /api/productos es público y viene paginado', async () => {
  await crearProducto({ nombre: 'Uno' })
  await crearProducto({ nombre: 'Dos' })

  const res = await request(app).get('/api/productos')

  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 2)
  assert.equal(res.body.meta.total, 2)
  assert.equal(res.body.meta.page, 1)
  assert.ok(res.body.data[0].id, 'los productos se exponen con `id`')
})

test('la paginación respeta page y limit', async () => {
  for (let i = 0; i < 5; i++) {
    await crearProducto({ nombre: `Producto ${i}` })
  }

  const res = await request(app).get('/api/productos?page=2&limit=2')

  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 2)
  assert.equal(res.body.meta.totalPages, 3)
  assert.equal(res.body.meta.hasNextPage, true)
  assert.equal(res.body.meta.hasPrevPage, true)
})

test('el limit tiene techo: ?limit=99999 no baja la colección entera', async () => {
  const res = await request(app).get('/api/productos?limit=99999')
  assert.equal(res.status, 400)
})

test('filtra por categoría', async () => {
  await crearProducto({ nombre: 'Silla', categoria: 'Sillas' })
  await crearProducto({ nombre: 'Mesa', categoria: 'Mesas' })

  const res = await request(app).get('/api/productos?categoria=Mesas')

  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 1)
  assert.equal(res.body.data[0].nombre, 'Mesa')
})

test('una ruta inexistente devuelve 404 en JSON', async () => {
  const res = await request(app).get('/api/no-existe')

  assert.equal(res.status, 404)
  assert.ok(res.body.message)
})
