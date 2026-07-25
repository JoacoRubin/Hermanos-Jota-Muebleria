const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const {
  setupTestApp,
  teardownTestApp,
  clearDatabase,
} = require('./helpers/testEnv')
const { registrarUsuario } = require('./helpers/factories')

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

test('registro: crea el usuario y devuelve access token + usuario con `id`', async () => {
  const res = await request(app).post('/api/auth/register').send({
    nombre: 'Joaquín',
    email: 'joaquin@ejemplo.com',
    password: 'password123',
  })

  assert.equal(res.status, 201)
  assert.ok(res.body.data.accessToken, 'debería venir un access token')
  assert.equal(res.body.data.user.email, 'joaquin@ejemplo.com')
  assert.equal(res.body.data.user.role, 'user')
  assert.ok(res.body.data.user.id, 'el identificador público se llama `id`')
  assert.equal(res.body.data.user._id, undefined, 'nunca se expone `_id`')
  assert.equal(res.body.data.user.password, undefined, 'nunca sale la password')
})

test('registro: el refresh token viaja en una cookie httpOnly, no en el body', async () => {
  const res = await request(app).post('/api/auth/register').send({
    nombre: 'Ana',
    email: 'ana@ejemplo.com',
    password: 'password123',
  })

  const cookies = res.headers['set-cookie'] || []
  const refreshCookie = cookies.find((c) => c.startsWith('hj_refresh='))

  assert.ok(refreshCookie, 'debería setear la cookie de refresh')
  assert.match(refreshCookie, /HttpOnly/i, 'la cookie debe ser httpOnly')
  assert.equal(
    res.body.data.refreshToken,
    undefined,
    'el refresh token nunca debe llegar al JavaScript del cliente'
  )
})

test('registro: NO se puede elegir el rol (escalada de privilegios)', async () => {
  const res = await request(app).post('/api/auth/register').send({
    nombre: 'Atacante',
    email: 'atacante@ejemplo.com',
    password: 'password123',
    role: 'admin',
  })

  assert.equal(res.status, 400, 'el campo `role` no está permitido en el body')
})

test('registro: rechaza contraseñas débiles', async () => {
  const res = await request(app).post('/api/auth/register').send({
    nombre: 'Débil',
    email: 'debil@ejemplo.com',
    password: 'abc',
  })

  assert.equal(res.status, 400)
  assert.ok(res.body.errors.some((e) => e.field === 'password'))
})

test('registro: rechaza emails duplicados', async () => {
  const payload = {
    nombre: 'Primero',
    email: 'repetido@ejemplo.com',
    password: 'password123',
  }

  await request(app).post('/api/auth/register').send(payload)
  const res = await request(app).post('/api/auth/register').send(payload)

  assert.equal(res.status, 409)
})

test('login: credenciales inválidas devuelven el MISMO mensaje exista o no el email', async () => {
  await registrarUsuario(app, {
    email: 'existe@ejemplo.com',
    password: 'password123',
  })

  const emailInexistente = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nadie@ejemplo.com', password: 'password123' })

  const passwordIncorrecta = await request(app)
    .post('/api/auth/login')
    .send({ email: 'existe@ejemplo.com', password: 'otraPassword123' })

  assert.equal(emailInexistente.status, 401)
  assert.equal(passwordIncorrecta.status, 401)
  assert.equal(
    emailInexistente.body.message,
    passwordIncorrecta.body.message,
    'los mensajes distintos permiten enumerar qué cuentas existen'
  )
})

test('login: inyección NoSQL con operadores no sirve para entrar', async () => {
  await registrarUsuario(app, {
    email: 'victima@ejemplo.com',
    password: 'password123',
  })

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: { $ne: null }, password: { $ne: null } })

  assert.equal(res.status, 400, 'el operador se filtra y el payload no valida')
})

test('rutas protegidas: sin token devuelven 401', async () => {
  const res = await request(app).get('/api/auth/profile')
  assert.equal(res.status, 401)
})

test('rutas protegidas: un token firmado con otro secreto no sirve', async () => {
  const jwt = require('jsonwebtoken')
  const tokenFalso = jwt.sign({ sub: '507f1f77bcf86cd799439011', type: 'access' }, 'secreto-inventado-por-el-atacante')

  const res = await request(app)
    .get('/api/auth/profile')
    .set('Authorization', `Bearer ${tokenFalso}`)

  assert.equal(res.status, 401)
})

test('refresh: rota el token y el anterior deja de servir (detección de reuso)', async () => {
  const registro = await request(app).post('/api/auth/register').send({
    nombre: 'Rotación',
    email: 'rotacion@ejemplo.com',
    password: 'password123',
  })

  const cookieOriginal = registro.headers['set-cookie']
  assert.ok(cookieOriginal, 'el registro debe dejar la cookie de refresh')

  const primerUso = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', cookieOriginal)

  assert.equal(primerUso.status, 200)
  assert.ok(primerUso.body.data.accessToken)
  assert.ok(
    primerUso.headers['set-cookie'],
    'la rotación debe entregar una cookie nueva'
  )

  // Segundo uso del MISMO token: ya fue rotado, así que no existe en la base.
  const reuso = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', cookieOriginal)

  assert.equal(
    reuso.status,
    401,
    'reutilizar un refresh token ya rotado debe fallar'
  )

  // Y por seguridad se cierran todas las sesiones: el token nuevo tampoco sirve.
  const tokenRotado = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', primerUso.headers['set-cookie'])

  assert.equal(
    tokenRotado.status,
    401,
    'ante un reuso se revocan todas las sesiones del usuario'
  )
})

test('logout: invalida el refresh token', async () => {
  const agent = request.agent(app)

  await agent.post('/api/auth/register').send({
    nombre: 'Salida',
    email: 'salida@ejemplo.com',
    password: 'password123',
  })

  await agent.post('/api/auth/logout').expect(200)

  const res = await agent.post('/api/auth/refresh')
  assert.equal(res.status, 401)
})
