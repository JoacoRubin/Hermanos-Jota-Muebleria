const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const {
  setupTestApp,
  teardownTestApp,
  clearDatabase,
} = require('./helpers/testEnv')
const { registrarUsuario, crearAdmin } = require('./helpers/factories')

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

const consultaValida = {
  nombre: 'Lucía Gómez',
  email: 'lucia@ejemplo.com',
  mensaje: 'Quisiera saber si hacen envíos al interior del país.',
}

test('cualquiera puede enviar una consulta', async () => {
  const res = await request(app).post('/api/contacto').send(consultaValida)

  assert.equal(res.status, 201)
  assert.ok(res.body.data.id)
  assert.ok(res.body.message)
})

test('la consulta queda persistida con estado "nueva"', async () => {
  await request(app).post('/api/contacto').send(consultaValida).expect(201)

  const ContactMessage = require('../src/models/ContactMessage')
  const guardada = await ContactMessage.findOne({ email: 'lucia@ejemplo.com' })

  assert.ok(guardada)
  assert.equal(guardada.estado, 'nueva')
  assert.equal(guardada.nombre, 'Lucía Gómez')
})

test('rechaza un email inválido', async () => {
  const res = await request(app)
    .post('/api/contacto')
    .send({ ...consultaValida, email: 'no-es-un-email' })

  assert.equal(res.status, 400)
  assert.ok(res.body.errors.some((e) => e.field === 'email'))
})

test('rechaza un mensaje demasiado corto', async () => {
  const res = await request(app)
    .post('/api/contacto')
    .send({ ...consultaValida, mensaje: 'hola' })

  assert.equal(res.status, 400)
})

test('rechaza campos no declarados', async () => {
  const res = await request(app)
    .post('/api/contacto')
    .send({ ...consultaValida, estado: 'respondida' })

  assert.equal(
    res.status,
    400,
    'nadie puede fijar el estado de su propia consulta'
  )
})

test('listar consultas requiere sesión', async () => {
  const res = await request(app).get('/api/contacto')
  assert.equal(res.status, 401)
})

test('un usuario normal no puede listar consultas', async () => {
  const { token } = await registrarUsuario(app)

  const res = await request(app)
    .get('/api/contacto')
    .set('Authorization', `Bearer ${token}`)

  assert.equal(res.status, 403)
})

test('un admin lista las consultas paginadas', async () => {
  const { token } = await crearAdmin(app)

  await request(app).post('/api/contacto').send(consultaValida)
  await request(app)
    .post('/api/contacto')
    .send({ ...consultaValida, email: 'otra@ejemplo.com' })

  const res = await request(app)
    .get('/api/contacto')
    .set('Authorization', `Bearer ${token}`)

  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 2)
  assert.equal(res.body.meta.total, 2)
  assert.ok(res.body.data[0].id)
})

test('un admin puede marcar una consulta como leída', async () => {
  const { token } = await crearAdmin(app)

  const creada = await request(app).post('/api/contacto').send(consultaValida)

  const res = await request(app)
    .put(`/api/contacto/${creada.body.data.id}/estado`)
    .set('Authorization', `Bearer ${token}`)
    .send({ estado: 'leida' })

  assert.equal(res.status, 200)
  assert.equal(res.body.data.estado, 'leida')
})

test('el estado de la consulta sólo admite valores del enum', async () => {
  const { token } = await crearAdmin(app)
  const creada = await request(app).post('/api/contacto').send(consultaValida)

  const res = await request(app)
    .put(`/api/contacto/${creada.body.data.id}/estado`)
    .set('Authorization', `Bearer ${token}`)
    .send({ estado: 'archivada' })

  assert.equal(res.status, 400)
})
