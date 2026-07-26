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
// La API NO devuelve el stock exacto al cliente
//
// Esta es la parte que no se puede resolver escondiendo el número en el JSX:
// lo que importa es lo que viaja en el JSON.
// ─────────────────────────────────────────────────────────────────────────────

test('el listado público no incluye el campo stock', async () => {
  await crearProducto({ stock: 47 })

  const res = await request(app).get('/api/productos').expect(200)

  const producto = res.body.data[0]
  assert.equal(
    'stock' in producto,
    false,
    'la clave `stock` no debe existir siquiera en la respuesta pública'
  )
  assert.equal(producto.stockStatus, 'disponible')
  assert.equal(producto.lowStockMessage, null)
  assert.equal(producto.unidadesRestantes, null)
})

test('la ficha pública de un producto tampoco lo incluye', async () => {
  const producto = await crearProducto({ stock: 47 })

  const res = await request(app)
    .get(`/api/productos/${producto._id}`)
    .expect(200)

  assert.equal('stock' in res.body.data, false)
})

test('un usuario normal autenticado sigue sin ver el stock', async () => {
  const { token } = await registrarUsuario(app)
  await crearProducto({ stock: 47 })

  const res = await request(app)
    .get('/api/productos')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  assert.equal(
    'stock' in res.body.data[0],
    false,
    'tener cuenta no da acceso al inventario'
  )
})

test('el admin SÍ ve la cantidad exacta, en el mismo endpoint', async () => {
  const admin = await crearAdmin(app)
  await crearProducto({ stock: 47 })

  const res = await request(app)
    .get('/api/productos')
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  assert.equal(res.body.data[0].stock, 47)
})

test('un token vencido o roto se trata como visitante anónimo, no como error', async () => {
  await crearProducto({ stock: 47 })

  const res = await request(app)
    .get('/api/productos')
    .set('Authorization', 'Bearer esto-no-es-un-jwt')

  assert.equal(res.status, 200, 'el catálogo no puede caerse por una cookie vieja')
  assert.equal('stock' in res.body.data[0], false)
})

test('el aviso de escasez llega calculado desde el servidor', async () => {
  await crearProducto({ nombre: 'Última butaca', stock: 1 })

  const res = await request(app).get('/api/productos').expect(200)

  assert.equal(res.body.data[0].lowStockMessage, 'Última unidad disponible')
  assert.equal(res.body.data[0].unidadesRestantes, 1)
})

test('un producto agotado se marca no disponible', async () => {
  await crearProducto({ stock: 0 })

  const res = await request(app).get('/api/productos').expect(200)

  assert.equal(res.body.data[0].stockStatus, 'agotado')
  assert.equal(res.body.data[0].disponible, false)
  assert.equal(res.body.data[0].lowStockMessage, 'Sin stock')
})

test('el error por falta de stock no filtra cuántas unidades hay', async () => {
  // Regresión: el mensaje anterior decía "Disponible: 3, solicitado: 99",
  // así que pedir de más funcionaba como consulta de inventario.
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 42 })

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 99 }],
      direccionEnvio: 'Av. San Juan 2847, CABA, Argentina',
    })

  assert.equal(res.status, 409)
  assert.equal(
    /\b42\b/.test(res.body.message),
    false,
    `el mensaje filtra el stock exacto: "${res.body.message}"`
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Reposición: suma, no reemplaza
// ─────────────────────────────────────────────────────────────────────────────

test('agregar stock SUMA al valor actual', async () => {
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })

  const res = await request(app)
    .post(`/api/productos/${producto._id}/stock`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ cantidad: 7, motivo: 'reposicion' })

  assert.equal(res.status, 200)
  assert.equal(res.body.data.stock, 12, '5 + 7 = 12, no 7')
})

test('dos reposiciones seguidas se acumulan', async () => {
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 0 })

  for (const cantidad of [3, 4]) {
    await request(app)
      .post(`/api/productos/${producto._id}/stock`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ cantidad })
      .expect(200)
  }

  const Product = require('../src/models/Product')
  assert.equal((await Product.findById(producto._id)).stock, 7)
})

test('no se puede reponer una cantidad negativa ni cero', async () => {
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })

  for (const cantidad of [0, -3, 1.5]) {
    const res = await request(app)
      .post(`/api/productos/${producto._id}/stock`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ cantidad })

    assert.equal(res.status, 400, `cantidad ${cantidad} debería rechazarse`)
  }
})

test('un usuario normal no puede reponer stock', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })

  const res = await request(app)
    .post(`/api/productos/${producto._id}/stock`)
    .set('Authorization', `Bearer ${token}`)
    .send({ cantidad: 100 })

  assert.equal(res.status, 403)
})

test('reponer stock sin sesión es 401', async () => {
  const producto = await crearProducto({ stock: 5 })

  const res = await request(app)
    .post(`/api/productos/${producto._id}/stock`)
    .send({ cantidad: 100 })

  assert.equal(res.status, 401)
})

// ─────────────────────────────────────────────────────────────────────────────
// El libro mayor
// ─────────────────────────────────────────────────────────────────────────────

test('la reposición queda asentada con motivo, usuario y stock resultante', async () => {
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })

  await request(app)
    .post(`/api/productos/${producto._id}/stock`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ cantidad: 7, motivo: 'reposicion', nota: 'Llegó el camión' })
    .expect(200)

  const res = await request(app)
    .get(`/api/productos/${producto._id}/movimientos`)
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  const movimiento = res.body.data[0]
  assert.equal(movimiento.cantidad, 7)
  assert.equal(movimiento.motivo, 'reposicion')
  assert.equal(movimiento.stockResultante, 12)
  assert.equal(movimiento.nota, 'Llegó el camión')
  assert.equal(movimiento.usuario.id, admin.user.id)
})

test('una venta se asienta con cantidad negativa y el id del pedido', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 10 })

  const creado = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({
      items: [{ producto: producto._id.toString(), cantidad: 3 }],
      direccionEnvio: 'Av. San Juan 2847, CABA, Argentina',
    })
    .expect(201)

  const res = await request(app)
    .get(`/api/productos/${producto._id}/movimientos`)
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  const venta = res.body.data.find((m) => m.motivo === 'venta')
  assert.ok(venta, 'la venta tiene que quedar registrada')
  assert.equal(venta.cantidad, -3)
  assert.equal(venta.stockResultante, 7)
  assert.equal(venta.pedidoId, creado.body.data.id)
})

test('un pedido rechazado por falta de stock NO deja rastro en el libro mayor', async () => {
  // Las reservas tentativas no se asientan: el ledger registra hechos
  // consumados. Si no, "venta −2 / cancelación +2" de algo que nunca se
  // vendió vuelve el historial ilegible.
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const hay = await crearProducto({ nombre: 'Hay', stock: 10 })
  const noHay = await crearProducto({ nombre: 'No hay', stock: 0 })

  await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({
      items: [
        { producto: hay._id.toString(), cantidad: 3 },
        { producto: noHay._id.toString(), cantidad: 1 },
      ],
      direccionEnvio: 'Av. San Juan 2847, CABA, Argentina',
    })
    .expect(409)

  const res = await request(app)
    .get(`/api/productos/${hay._id}/movimientos`)
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  const ventas = res.body.data.filter((m) => m.motivo === 'venta')
  assert.equal(ventas.length, 0, 'una reserva compensada no es una venta')

  const Product = require('../src/models/Product')
  assert.equal((await Product.findById(hay._id)).stock, 10)
})

test('el alta de producto asienta su stock inicial', async () => {
  const admin = await crearAdmin(app)

  const creado = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({
      nombre: 'Mesa Nueva',
      descripcion: 'Recién dada de alta',
      precio: 100000,
      stock: 8,
      categoria: 'Mesas',
    })
    .expect(201)

  const res = await request(app)
    .get(`/api/productos/${creado.body.data.id}/movimientos`)
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  assert.equal(res.body.data.length, 1)
  assert.equal(res.body.data[0].cantidad, 8)
  assert.equal(res.body.data[0].stockResultante, 8)
})

test('editar el stock a mano queda asentado como ajuste, con el delta', async () => {
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 10 })

  await request(app)
    .put(`/api/productos/${producto._id}`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ stock: 4 })
    .expect(200)

  const res = await request(app)
    .get(`/api/productos/${producto._id}/movimientos`)
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  const ajuste = res.body.data.find((m) => m.motivo === 'ajuste')
  assert.ok(ajuste)
  assert.equal(ajuste.cantidad, -6, '10 → 4 es un delta de −6')
  assert.equal(ajuste.stockResultante, 4)
})

test('un usuario normal no puede ver el historial de movimientos', async () => {
  const { token } = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })

  const res = await request(app)
    .get(`/api/productos/${producto._id}/movimientos`)
    .set('Authorization', `Bearer ${token}`)

  assert.equal(res.status, 403)
})

// ─────────────────────────────────────────────────────────────────────────────
// Concurrencia
// ─────────────────────────────────────────────────────────────────────────────

test('dos compras simultáneas de la última unidad: gana una sola', async () => {
  const uno = await registrarUsuario(app, { email: 'uno-conc@ejemplo.com' })
  const dos = await registrarUsuario(app, { email: 'dos-conc@ejemplo.com' })
  const producto = await crearProducto({ nombre: 'Última butaca', stock: 1 })

  const pedido = (token) =>
    request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ producto: producto._id.toString(), cantidad: 1 }],
        direccionEnvio: 'Av. San Juan 2847, CABA, Argentina',
      })

  const [a, b] = await Promise.all([pedido(uno.token), pedido(dos.token)])

  const estados = [a.status, b.status].sort()
  assert.deepEqual(
    estados,
    [201, 409],
    `esperaba un éxito y un rechazo, salió ${estados}`
  )

  const Product = require('../src/models/Product')
  const final = await Product.findById(producto._id)
  assert.equal(final.stock, 0, 'el stock nunca puede quedar negativo')
})

test('diez reposiciones simultáneas suman las diez', async () => {
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 0 })

  await Promise.all(
    Array.from({ length: 10 }, () =>
      request(app)
        .post(`/api/productos/${producto._id}/stock`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ cantidad: 1 })
    )
  )

  const Product = require('../src/models/Product')
  assert.equal(
    (await Product.findById(producto._id)).stock,
    10,
    'con $inc no se pierde ninguna: leer-modificar-escribir sí las perdería'
  )
})
