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

/** Crea un pedido y devuelve su id. */
async function crearPedido(token, productoId, cantidad = 1) {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ producto: productoId.toString(), cantidad }],
      direccionEnvio: direccionValida,
    })
    .expect(201)

  return res.body.data.id
}

const cambiarEstado = (adminToken, pedidoId, body) =>
  request(app)
    .put(`/api/orders/${pedidoId}/estado`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(body)

/** Lleva un pedido hasta el estado pedido, paso por paso. */
async function avanzarHasta(adminToken, pedidoId, destino) {
  const camino = ['aceptado', 'despachado', 'entregado']
  for (const estado of camino) {
    await cambiarEstado(adminToken, pedidoId, { estado }).expect(200)
    if (estado === destino) return
  }
}

const stockDe = async (productoId) => {
  const Product = require('../src/models/Product')
  return (await Product.findById(productoId)).stock
}

// ═════════════════════════════════════════════════════════════════════════════
// Transiciones de estado
// ═════════════════════════════════════════════════════════════════════════════

test('el admin puede recorrer el flujo completo', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  for (const estado of ['aceptado', 'despachado', 'entregado']) {
    const res = await cambiarEstado(admin.token, pedidoId, { estado })
    assert.equal(res.status, 200, `falló al pasar a ${estado}`)
    assert.equal(res.body.data.estado, estado)
  }
})

test('no se puede saltear de pendiente a despachado', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  const res = await cambiarEstado(admin.token, pedidoId, {
    estado: 'despachado',
  })

  assert.equal(res.status, 409)
  assert.match(res.body.message, /no se puede pasar/i)
})

test('no se puede saltear de pendiente a entregado', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  const res = await cambiarEstado(admin.token, pedidoId, { estado: 'entregado' })
  assert.equal(res.status, 409)
})

test('no se puede retroceder de aceptado a pendiente', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' }).expect(200)

  const res = await cambiarEstado(admin.token, pedidoId, {
    estado: 'pendiente',
  })
  assert.equal(res.status, 409)
})

test('un pedido CANCELADO no se puede despachar', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, pedidoId, { estado: 'cancelado' }).expect(200)

  const res = await cambiarEstado(admin.token, pedidoId, {
    estado: 'despachado',
  })

  assert.equal(res.status, 409)
  assert.match(res.body.message, /final/i)
})

test('un pedido ENTREGADO ya no cambia de estado', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await avanzarHasta(admin.token, pedidoId, 'entregado')

  for (const estado of ['despachado', 'cancelado', 'pendiente']) {
    const res = await cambiarEstado(admin.token, pedidoId, { estado })
    assert.equal(res.status, 409, `entregado → ${estado} debería rechazarse`)
  }
})

test('repetir el estado actual es idempotente, no un error', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' }).expect(200)

  const res = await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.estado, 'aceptado')
})

test('un usuario normal no puede cambiar estados aunque sea su pedido', async () => {
  const usuario = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  const res = await request(app)
    .put(`/api/orders/${pedidoId}/estado`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({ estado: 'entregado' })

  assert.equal(res.status, 403)
})

// ═════════════════════════════════════════════════════════════════════════════
// Historial
// ═════════════════════════════════════════════════════════════════════════════

test('el pedido nace con una entrada de historial', async () => {
  const usuario = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  const res = await request(app)
    .get(`/api/orders/${pedidoId}`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .expect(200)

  assert.equal(res.body.data.historialEstados.length, 1)
  assert.equal(res.body.data.historialEstados[0].estado, 'pendiente')
  assert.ok(res.body.data.historialEstados[0].fecha)
})

test('cada cambio suma una entrada con quién lo hizo', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' }).expect(200)
  await cambiarEstado(admin.token, pedidoId, {
    estado: 'despachado',
    nota: 'Sale con el flete del jueves',
  }).expect(200)

  const res = await request(app)
    .get(`/api/orders/${pedidoId}`)
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  const historial = res.body.data.historialEstados
  assert.deepEqual(
    historial.map((h) => h.estado),
    ['pendiente', 'aceptado', 'despachado']
  )
  assert.equal(historial[2].nota, 'Sale con el flete del jueves')
  assert.equal(historial[2].usuario.id, admin.user.id)
  assert.equal(historial[2].rol, 'admin')
})

test('una transición rechazada NO deja rastro en el historial', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, pedidoId, { estado: 'entregado' }).expect(409)

  const res = await request(app)
    .get(`/api/orders/${pedidoId}`)
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  assert.equal(res.body.data.historialEstados.length, 1)
})

// ═════════════════════════════════════════════════════════════════════════════
// Seguimiento
// ═════════════════════════════════════════════════════════════════════════════

test('al despachar se puede cargar número de seguimiento y transportista', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' }).expect(200)

  const res = await cambiarEstado(admin.token, pedidoId, {
    estado: 'despachado',
    seguimiento: { numero: 'AR-998877', transportista: 'Andreani' },
  })

  assert.equal(res.status, 200)
  assert.equal(res.body.data.seguimiento.numero, 'AR-998877')
  assert.equal(res.body.data.seguimiento.transportista, 'Andreani')
})

test('el seguimiento es opcional: se puede despachar sin datos', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' }).expect(200)
  const res = await cambiarEstado(admin.token, pedidoId, {
    estado: 'despachado',
  })

  assert.equal(res.status, 200)
  assert.equal(res.body.data.seguimiento.numero, '')
})

test('un cambio posterior sin seguimiento no borra el que ya estaba', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' }).expect(200)
  await cambiarEstado(admin.token, pedidoId, {
    estado: 'despachado',
    seguimiento: { numero: 'AR-998877', transportista: 'Andreani' },
  }).expect(200)

  const res = await cambiarEstado(admin.token, pedidoId, {
    estado: 'entregado',
  })

  assert.equal(res.body.data.seguimiento.numero, 'AR-998877')
})

// ═════════════════════════════════════════════════════════════════════════════
// Cancelación y reingreso de stock
// ═════════════════════════════════════════════════════════════════════════════

test('el cliente puede cancelar su pedido pendiente y vuelve el stock', async () => {
  const usuario = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 2)

  assert.equal(await stockDe(producto._id), 3)

  const res = await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({ motivo: 'Me arrepentí' })

  assert.equal(res.status, 200)
  assert.equal(res.body.data.estado, 'cancelado')
  assert.equal(await stockDe(producto._id), 5)
})

test('el cliente puede cancelar un pedido ACEPTADO', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 2)

  await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' }).expect(200)

  const res = await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({})

  assert.equal(res.status, 200)
  assert.equal(await stockDe(producto._id), 5)
})

test('el cliente NO puede cancelar un pedido DESPACHADO', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 2)

  await avanzarHasta(admin.token, pedidoId, 'despachado')

  const res = await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({})

  assert.equal(res.status, 409)
  assert.equal(await stockDe(producto._id), 3, 'el stock no se tocó')
})

test('el ADMIN sí puede cancelar un pedido despachado', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 2)

  await avanzarHasta(admin.token, pedidoId, 'despachado')

  const res = await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ motivo: 'El transportista lo devolvió' })

  assert.equal(res.status, 200)
  assert.equal(await stockDe(producto._id), 5)
})

test('nadie puede cancelar un pedido ENTREGADO', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 2)

  await avanzarHasta(admin.token, pedidoId, 'entregado')

  for (const token of [usuario.token, admin.token]) {
    const res = await request(app)
      .post(`/api/orders/${pedidoId}/cancelar`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    assert.equal(res.status, 409)
  }

  assert.equal(await stockDe(producto._id), 3)
})

test('un usuario NO puede cancelar el pedido de otro', async () => {
  const dueno = await registrarUsuario(app, { email: 'dueno-c@ejemplo.com' })
  const ajeno = await registrarUsuario(app, { email: 'ajeno-c@ejemplo.com' })
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(dueno.token, producto._id, 2)

  const res = await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${ajeno.token}`)
    .send({})

  assert.equal(res.status, 403)
  assert.equal(await stockDe(producto._id), 3, 'el stock no se tocó')
})

test('cancelar sin sesión es 401', async () => {
  const usuario = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  const res = await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .send({})

  assert.equal(res.status, 401)
})

// ─── La doble cancelación: EL test que justifica el claim atómico ───────────

test('cancelar dos veces NO devuelve el stock dos veces', async () => {
  const usuario = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 3)

  assert.equal(await stockDe(producto._id), 2)

  await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({})
    .expect(200)

  const segunda = await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({})

  assert.equal(segunda.status, 409)
  assert.match(segunda.body.message, /ya estaba cancelado/i)
  assert.equal(
    await stockDe(producto._id),
    5,
    'si diera 8, la segunda cancelación inventó 3 unidades que no existen'
  )
})

test('cinco cancelaciones SIMULTÁNEAS devuelven el stock una sola vez', async () => {
  // Este es el caso que un `if (order.estado !== "cancelado")` no cubre:
  // los cinco leen "pendiente" antes de que ninguno escriba.
  const usuario = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 10 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 4)

  assert.equal(await stockDe(producto._id), 6)

  const respuestas = await Promise.all(
    Array.from({ length: 5 }, () =>
      request(app)
        .post(`/api/orders/${pedidoId}/cancelar`)
        .set('Authorization', `Bearer ${usuario.token}`)
        .send({})
    )
  )

  const exitosas = respuestas.filter((r) => r.status === 200)
  assert.equal(exitosas.length, 1, 'exactamente una tiene que ganar el claim')
  assert.equal(
    await stockDe(producto._id),
    10,
    'el stock volvió una vez, no cinco'
  )
})

test('el cliente y el admin cancelando a la vez tampoco duplican el stock', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 10 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 4)

  const [a, b] = await Promise.all([
    request(app)
      .post(`/api/orders/${pedidoId}/cancelar`)
      .set('Authorization', `Bearer ${usuario.token}`)
      .send({}),
    request(app)
      .put(`/api/orders/${pedidoId}/estado`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ estado: 'cancelado' }),
  ])

  const exitosas = [a, b].filter((r) => r.status === 200)
  assert.equal(exitosas.length, 1)
  assert.equal(await stockDe(producto._id), 10)
})

test('cancelar via PUT /estado usa el mismo camino y devuelve el stock', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 2)

  await cambiarEstado(admin.token, pedidoId, { estado: 'cancelado' }).expect(200)

  assert.equal(await stockDe(producto._id), 5)
})

test('la cancelación devuelve el stock de TODOS los ítems del pedido', async () => {
  const usuario = await registrarUsuario(app)
  const silla = await crearProducto({ nombre: 'Silla', stock: 10 })
  const mesa = await crearProducto({ nombre: 'Mesa', stock: 8 })

  const creado = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({
      items: [
        { producto: silla._id.toString(), cantidad: 4 },
        { producto: mesa._id.toString(), cantidad: 2 },
      ],
      direccionEnvio: direccionValida,
    })
    .expect(201)

  assert.equal(await stockDe(silla._id), 6)
  assert.equal(await stockDe(mesa._id), 6)

  await request(app)
    .post(`/api/orders/${creado.body.data.id}/cancelar`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({})
    .expect(200)

  assert.equal(await stockDe(silla._id), 10)
  assert.equal(await stockDe(mesa._id), 8)
})

test('la devolución queda asentada en el libro mayor', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id, 2)

  await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({})
    .expect(200)

  const res = await request(app)
    .get(`/api/productos/${producto._id}/movimientos`)
    .set('Authorization', `Bearer ${admin.token}`)
    .expect(200)

  const devolucion = res.body.data.find((m) => m.motivo === 'cancelacion')
  assert.ok(devolucion)
  assert.equal(devolucion.cantidad, 2)
  assert.equal(devolucion.stockResultante, 5)
  assert.equal(devolucion.pedidoId, pedidoId)
})

test('el pedido cancelado guarda quién y por qué', async () => {
  const usuario = await registrarUsuario(app)
  const producto = await crearProducto({ stock: 5 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  const res = await request(app)
    .post(`/api/orders/${pedidoId}/cancelar`)
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({ motivo: 'Compré otro modelo' })
    .expect(200)

  assert.equal(res.body.data.motivoCancelacion, 'Compré otro modelo')

  const ultima = res.body.data.historialEstados.at(-1)
  assert.equal(ultima.estado, 'cancelado')
  assert.equal(ultima.usuario.id, usuario.user.id)
  assert.equal(ultima.rol, 'user')
})

test('cancelar un pedido inexistente es 404', async () => {
  const usuario = await registrarUsuario(app)

  const res = await request(app)
    .post('/api/orders/507f1f77bcf86cd799439011/cancelar')
    .set('Authorization', `Bearer ${usuario.token}`)
    .send({})

  assert.equal(res.status, 404)
})

// ═════════════════════════════════════════════════════════════════════════════
// Mis pedidos: las pestañas
// ═════════════════════════════════════════════════════════════════════════════

test('el grupo "pendientes" incluye pendiente, aceptado y despachado', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 20 })

  const enPendiente = await crearPedido(usuario.token, producto._id)
  const enAceptado = await crearPedido(usuario.token, producto._id)
  const enDespachado = await crearPedido(usuario.token, producto._id)

  await cambiarEstado(admin.token, enAceptado, { estado: 'aceptado' })
  await avanzarHasta(admin.token, enDespachado, 'despachado')

  const res = await request(app)
    .get('/api/orders/mis-pedidos?grupo=pendientes')
    .set('Authorization', `Bearer ${usuario.token}`)
    .expect(200)

  const ids = res.body.data.map((p) => p.id).sort()
  assert.deepEqual(ids, [enPendiente, enAceptado, enDespachado].sort())
})

test('los grupos "entregados" y "cancelados" filtran bien', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 20 })

  const entregado = await crearPedido(usuario.token, producto._id)
  const cancelado = await crearPedido(usuario.token, producto._id)
  await crearPedido(usuario.token, producto._id) // queda pendiente

  await avanzarHasta(admin.token, entregado, 'entregado')
  await cambiarEstado(admin.token, cancelado, { estado: 'cancelado' })

  const entregados = await request(app)
    .get('/api/orders/mis-pedidos?grupo=entregados')
    .set('Authorization', `Bearer ${usuario.token}`)
    .expect(200)

  const cancelados = await request(app)
    .get('/api/orders/mis-pedidos?grupo=cancelados')
    .set('Authorization', `Bearer ${usuario.token}`)
    .expect(200)

  assert.deepEqual(
    entregados.body.data.map((p) => p.id),
    [entregado]
  )
  assert.deepEqual(
    cancelados.body.data.map((p) => p.id),
    [cancelado]
  )
})

test('un grupo inventado se rechaza con 400', async () => {
  const usuario = await registrarUsuario(app)

  const res = await request(app)
    .get('/api/orders/mis-pedidos?grupo=inventado')
    .set('Authorization', `Bearer ${usuario.token}`)

  assert.equal(res.status, 400)
})

test('puedeCancelarCliente refleja el estado real del pedido', async () => {
  const usuario = await registrarUsuario(app)
  const admin = await crearAdmin(app)
  const producto = await crearProducto({ stock: 10 })
  const pedidoId = await crearPedido(usuario.token, producto._id)

  const leer = async () => {
    const res = await request(app)
      .get(`/api/orders/${pedidoId}`)
      .set('Authorization', `Bearer ${usuario.token}`)
      .expect(200)
    return res.body.data.puedeCancelarCliente
  }

  assert.equal(await leer(), true, 'pendiente: se puede')

  await cambiarEstado(admin.token, pedidoId, { estado: 'aceptado' })
  assert.equal(await leer(), true, 'aceptado: se puede')

  await cambiarEstado(admin.token, pedidoId, { estado: 'despachado' })
  assert.equal(await leer(), false, 'despachado: el cliente ya no')
})
