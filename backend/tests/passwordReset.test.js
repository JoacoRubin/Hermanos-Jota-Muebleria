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

const PASSWORD_NUEVA = 'passwordNueva456'

/**
 * Captura el link de recuperación del log.
 *
 * En test el driver de mail es `console`, así que el mail entero —link
 * incluido— sale por `console.log`. Interceptarlo es la forma honesta de
 * probar el flujo COMPLETO: si el link que se manda estuviera mal armado,
 * generar el token a mano en la base no lo detectaría nunca.
 */
async function pedirLinkDeRecuperacion(email) {
  const original = console.log
  let capturado = ''
  console.log = (...args) => {
    capturado += args.join(' ')
  }

  try {
    await request(app).post('/api/auth/forgot-password').send({ email })
  } finally {
    console.log = original
  }

  const match = capturado.match(/restablecer-password\?token=([\w-]+)/)
  return { token: match?.[1] ?? null, salida: capturado }
}

/** Crea un token directamente en la base, con vencimiento a medida. */
async function crearTokenConVencimiento(usuarioId, minutosDesdeAhora) {
  const crypto = require('crypto')
  const PasswordResetToken = require('../src/models/PasswordResetToken')
  const { hashToken } = require('../src/utils/tokens')

  const token = crypto.randomBytes(32).toString('base64url')

  await PasswordResetToken.create({
    usuario: usuarioId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + minutosDesdeAhora * 60 * 1000),
  })

  return token
}

// ─────────────────────────────────────────────────────────────────────────────
// No revelar si la cuenta existe
// ─────────────────────────────────────────────────────────────────────────────

test('la respuesta es idéntica exista o no el email', async () => {
  await registrarUsuario(app, { email: 'existe@ejemplo.com' })

  const conCuenta = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'existe@ejemplo.com' })

  const sinCuenta = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'no-existe-jamas@ejemplo.com' })

  assert.equal(conCuenta.status, 200)
  assert.equal(sinCuenta.status, 200)
  assert.equal(
    conCuenta.body.message,
    sinCuenta.body.message,
    'un mensaje distinto convierte el endpoint en un oráculo de enumeración'
  )
})

test('un email inexistente no crea ningún token', async () => {
  await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'fantasma@ejemplo.com' })
    .expect(200)

  const PasswordResetToken = require('../src/models/PasswordResetToken')
  assert.equal(await PasswordResetToken.countDocuments(), 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// El token: hasheado, de un solo uso, con vencimiento
// ─────────────────────────────────────────────────────────────────────────────

test('el token NO se guarda en texto plano', async () => {
  const { user } = await registrarUsuario(app, { email: 'hash@ejemplo.com' })
  const { token } = await pedirLinkDeRecuperacion('hash@ejemplo.com')

  assert.ok(token, 'el link tiene que salir en el mail')

  const PasswordResetToken = require('../src/models/PasswordResetToken')
  const registro = await PasswordResetToken.findOne({ usuario: user.id })

  assert.ok(registro)
  assert.notEqual(
    registro.tokenHash,
    token,
    'si el hash es igual al token, no se hasheó nada'
  )

  const { hashToken } = require('../src/utils/tokens')
  assert.equal(registro.tokenHash, hashToken(token))

  // Y por las dudas: el token en claro no aparece en NINGÚN campo.
  const crudo = JSON.stringify(registro.toObject())
  assert.equal(crudo.includes(token), false)
})

test('el flujo completo funciona: pido el link, lo canjeo, entro con la nueva', async () => {
  await registrarUsuario(app, { email: 'flujo@ejemplo.com' })
  const { token } = await pedirLinkDeRecuperacion('flujo@ejemplo.com')

  await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: PASSWORD_NUEVA })
    .expect(200)

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'flujo@ejemplo.com', password: PASSWORD_NUEVA })

  assert.equal(login.status, 200)
})

test('la contraseña vieja deja de servir', async () => {
  const { password: vieja } = await registrarUsuario(app, {
    email: 'vieja@ejemplo.com',
  })
  const { token } = await pedirLinkDeRecuperacion('vieja@ejemplo.com')

  await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: PASSWORD_NUEVA })
    .expect(200)

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'vieja@ejemplo.com', password: vieja })

  assert.equal(login.status, 401)
})

test('el token es de UN SOLO USO: el segundo canje falla', async () => {
  await registrarUsuario(app, { email: 'unavez@ejemplo.com' })
  const { token } = await pedirLinkDeRecuperacion('unavez@ejemplo.com')

  await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: PASSWORD_NUEVA })
    .expect(200)

  const segundo = await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: 'otraPassword789' })

  assert.equal(segundo.status, 400)

  // Y lo importante: la contraseña NO cambió en el segundo intento.
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'unavez@ejemplo.com', password: 'otraPassword789' })

  assert.equal(login.status, 401, 'el segundo canje no debe haber hecho nada')
})

test('un token vencido se rechaza', async () => {
  const { user } = await registrarUsuario(app, { email: 'vencido@ejemplo.com' })
  // Vencido hace una hora.
  const token = await crearTokenConVencimiento(user.id, -60)

  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: PASSWORD_NUEVA })

  assert.equal(res.status, 400)
})

test('un token que vence en un minuto todavía sirve', async () => {
  const { user } = await registrarUsuario(app, { email: 'justo@ejemplo.com' })
  const token = await crearTokenConVencimiento(user.id, 1)

  await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: PASSWORD_NUEVA })
    .expect(200)
})

test('un token inventado se rechaza', async () => {
  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({ token: 'a'.repeat(43), password: PASSWORD_NUEVA })

  assert.equal(res.status, 400)
})

test('vencido, usado e inexistente dan el MISMO mensaje', async () => {
  const { user } = await registrarUsuario(app, { email: 'mismo@ejemplo.com' })

  const vencido = await crearTokenConVencimiento(user.id, -60)
  const usado = await crearTokenConVencimiento(user.id, 60)
  await request(app)
    .post('/api/auth/reset-password')
    .send({ token: usado, password: PASSWORD_NUEVA })
    .expect(200)

  const respuestas = await Promise.all(
    [vencido, usado, 'z'.repeat(43)].map((token) =>
      request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'otraMas999' })
    )
  )

  const mensajes = new Set(respuestas.map((r) => r.body.message))
  assert.equal(
    mensajes.size,
    1,
    `distinguir los casos delata qué links existieron: ${[...mensajes]}`
  )
})

test('pedir un link nuevo invalida el anterior', async () => {
  await registrarUsuario(app, { email: 'rotar@ejemplo.com' })

  const primero = await pedirLinkDeRecuperacion('rotar@ejemplo.com')
  const segundo = await pedirLinkDeRecuperacion('rotar@ejemplo.com')

  assert.notEqual(primero.token, segundo.token)

  const conViejo = await request(app)
    .post('/api/auth/reset-password')
    .send({ token: primero.token, password: PASSWORD_NUEVA })

  assert.equal(
    conViejo.status,
    400,
    'dos links vigentes son dos llaves de la misma cerradura dando vueltas'
  )

  await request(app)
    .post('/api/auth/reset-password')
    .send({ token: segundo.token, password: PASSWORD_NUEVA })
    .expect(200)
})

// ─────────────────────────────────────────────────────────────────────────────
// Consecuencias del cambio
// ─────────────────────────────────────────────────────────────────────────────

test('restablecer cierra todas las sesiones abiertas', async () => {
  const { user } = await registrarUsuario(app, { email: 'sesiones@ejemplo.com' })

  // Dos logins más: tres sesiones vivas en total.
  for (let i = 0; i < 2; i++) {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'sesiones@ejemplo.com', password: 'password123' })
      .expect(200)
  }

  const User = require('../src/models/User')
  const antes = await User.findById(user.id).select('+refreshTokens')
  assert.ok(antes.refreshTokens.length >= 2)

  const { token } = await pedirLinkDeRecuperacion('sesiones@ejemplo.com')
  await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: PASSWORD_NUEVA })
    .expect(200)

  const despues = await User.findById(user.id).select('+refreshTokens')
  assert.equal(
    despues.refreshTokens.length,
    0,
    'si le robaron la cuenta, el atacante tiene que quedar afuera'
  )
})

test('el refresh token anterior deja de funcionar', async () => {
  const { cookies } = await registrarUsuario(app, {
    email: 'refresh@ejemplo.com',
  })

  const { token } = await pedirLinkDeRecuperacion('refresh@ejemplo.com')
  await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: PASSWORD_NUEVA })
    .expect(200)

  const res = await request(app).post('/api/auth/refresh').set('Cookie', cookies)

  assert.equal(res.status, 401)
})

test('la contraseña nueva respeta la política del registro', async () => {
  const { user } = await registrarUsuario(app, { email: 'politica@ejemplo.com' })
  const token = await crearTokenConVencimiento(user.id, 60)

  // Corta y sin número: lo mismo que rechazaría el registro.
  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: 'corta' })

  assert.equal(res.status, 400)
})

test('no se puede colar un campo extra en el reseteo', async () => {
  const { user } = await registrarUsuario(app, { email: 'extra@ejemplo.com' })
  const token = await crearTokenConVencimiento(user.id, 60)

  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({ token, password: PASSWORD_NUEVA, role: 'admin' })

  assert.equal(res.status, 400, '.strict() rechaza lo no declarado')
})
