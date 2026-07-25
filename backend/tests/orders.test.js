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

const direccionValida = 'Av. San Juan 2847, CABA, Argentina'

// ─────────────────────────────────────────────────────────────────────────────
// Manipulación de precios: el hallazgo C3.
// ─────────────────────────────────────────────────────────────────────────────

test('el cliente NO puede mandar el precio', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ precio: 210000, stock: 5 })

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 1, precio: 1 }],
      direccionEnvio: direccionValida,
    })

  assert.equal(res.status, 400, '`precio` no es un campo aceptado en el body')
})

test('el total se calcula con los precios de la base', async () => {
  const { token } = await registrarUsuario(app)
  const caro = await crearProducto({ nombre: 'Aparador', precio: 210000, stock: 3 })
  const barato = await crearProducto({ nombre: 'Mesa', precio: 85000, stock: 3 })

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [
        { producto: caro._id.toString(), cantidad: 2 },
        { producto: barato._id.toString(), cantidad: 1 },
      ],
      direccionEnvio: direccionValida,
    })

  assert.equal(res.status, 201)
  assert.equal(res.body.data.total, 210000 * 2 + 85000)
  assert.equal(res.body.data.items[0].precio, 210000)
  assert.equal(res.body.data.items[0].nombre, 'Aparador')
})

test('un producto inexistente no genera pedido', async () => {
  const { token } = await registrarUsuario(app)

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: '507f1f77bcf86cd799439011', cantidad: 1 }],
      direccionEnvio: direccionValida,
    })

  assert.equal(res.status, 400)
})

// ─────────────────────────────────────────────────────────────────────────────
// Stock: el hallazgo A5.
// ─────────────────────────────────────────────────────────────────────────────

test('crear un pedido descuenta el stock', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })

  await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 2 }],
      direccionEnvio: direccionValida,
    })
    .expect(201)

  const Product = require('../src/models/Product')
  const actualizado = await Product.findById(producto._id)
  assert.equal(actualizado.stock, 3)
})

test('no se puede comprar más de lo que hay', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 1 })

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 10 }],
      direccionEnvio: direccionValida,
    })

  assert.equal(res.status, 409)

  const Product = require('../src/models/Product')
  const sinCambios = await Product.findById(producto._id)
  assert.equal(sinCambios.stock, 1, 'el stock no debe haberse tocado')
})

test('si un ítem falla, se devuelve el stock ya reservado de los otros', async () => {
  const { token } = await registrarUsuario(app)
  const disponible = await crearProducto({ nombre: 'Hay', stock: 10 })
  const agotado = await crearProducto({ nombre: 'No hay', stock: 0 })

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [
        { producto: disponible._id.toString(), cantidad: 3 },
        { producto: agotado._id.toString(), cantidad: 1 },
      ],
      direccionEnvio: direccionValida,
    })

  assert.equal(res.status, 409)

  const Product = require('../src/models/Product')
  const restaurado = await Product.findById(disponible._id)
  assert.equal(
    restaurado.stock,
    10,
    'la compensación tiene que devolver las 3 unidades reservadas'
  )
})

test('el mismo producto repetido se agrupa y respeta el stock total', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 3 })

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [
        { producto: producto._id.toString(), cantidad: 2 },
        { producto: producto._id.toString(), cantidad: 2 },
      ],
      direccionEnvio: direccionValida,
    })

  assert.equal(res.status, 409, '2 + 2 = 4 y solo hay 3')

  const Product = require('../src/models/Product')
  assert.equal((await Product.findById(producto._id)).stock, 3)
})

// ─────────────────────────────────────────────────────────────────────────────
// Autorización: el hallazgo B1 (403 al propio dueño) y la fuga entre usuarios.
// ─────────────────────────────────────────────────────────────────────────────

test('el dueño puede ver su propio pedido', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })

  const creado = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 1 }],
      direccionEnvio: direccionValida,
    })

  const res = await request(app)
    .get(`/api/orders/${creado.body.data.id}`)
    .set('Authorization', `Bearer ${token}`)

  assert.equal(
    res.status,
    200,
    'comparar un ObjectId con un string daba 403 hasta al dueño'
  )
})

test('otro usuario NO puede ver un pedido ajeno', async () => {
  const dueno = await registrarUsuario(app, { email: 'dueno@ejemplo.com' })
  const curioso = await registrarUsuario(app, { email: 'curioso@ejemplo.com' })
  const producto = await crearProducto({ stock: 5 })

  const creado = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${dueno.token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 1 }],
      direccionEnvio: direccionValida,
    })

  const res = await request(app)
    .get(`/api/orders/${creado.body.data.id}`)
    .set('Authorization', `Bearer ${curioso.token}`)

  assert.equal(res.status, 403)
})

test('mis-pedidos solo devuelve los pedidos propios', async () => {
  const uno = await registrarUsuario(app, { email: 'uno@ejemplo.com' })
  const dos = await registrarUsuario(app, { email: 'dos@ejemplo.com' })
  const producto = await crearProducto({ stock: 10 })

  const pedido = {
    items: [{ producto: producto._id.toString(), cantidad: 1 }],
    direccionEnvio: direccionValida,
  }

  await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${uno.token}`)
    .send(pedido)

  const res = await request(app)
    .get('/api/orders/mis-pedidos')
    .set('Authorization', `Bearer ${dos.token}`)

  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 0)
})

test('un usuario normal no puede listar todos los pedidos', async () => {
  const { token } = await registrarUsuario(app)

  const res = await request(app)
    .get('/api/orders/admin/all')
    .set('Authorization', `Bearer ${token}`)

  assert.equal(res.status, 403)
})

test('un usuario normal no puede cambiar el estado de un pedido', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })

  const creado = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 1 }],
      direccionEnvio: direccionValida,
    })

  const res = await request(app)
    .put(`/api/orders/${creado.body.data.id}/estado`)
    .set('Authorization', `Bearer ${token}`)
    .send({ estado: 'entregado' })

  assert.equal(res.status, 403)
})

test('cancelar un pedido devuelve el stock', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })

  const creado = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 2 }],
      direccionEnvio: direccionValida,
    })

  const Product = require('../src/models/Product')
  assert.equal((await Product.findById(producto._id)).stock, 3)

  await request(app)
    .put(`/api/orders/${creado.body.data.id}/estado`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ estado: 'cancelado' })
    .expect(200)

  assert.equal(
    (await Product.findById(producto._id)).stock,
    5,
    'cancelar tiene que devolver las unidades a la góndola'
  )
})

test('el estado del pedido solo admite valores del enum', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })

  const creado = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 1 }],
      direccionEnvio: direccionValida,
    })

  const res = await request(app)
    .put(`/api/orders/${creado.body.data.id}/estado`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ estado: 'regalado' })

  assert.equal(res.status, 400)
})

test('crear un pedido exige autenticación', async () => {
  const producto = await crearProducto({ stock: 5 })

  const res = await request(app)
    .post('/api/orders')
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 1 }],
      direccionEnvio: direccionValida,
    })

  assert.equal(res.status, 401)
})

test('la dirección de envío es obligatoria', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 1 }],
      direccionEnvio: '   ',
    })

  assert.equal(res.status, 400)
})
