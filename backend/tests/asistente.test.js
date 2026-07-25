const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const { setupTestApp, teardownTestApp } = require('./helpers/testEnv')

let app

test.before(async () => {
  app = await setupTestApp()
})

test.after(async () => {
  await teardownTestApp()
})

// El controller usa `fetch` global para hablar con el RAG. Lo mockeamos: el test
// no debe depender de que el microservicio Python esté levantado.
test.afterEach(() => {
  mock.restoreAll()
})

function mockRag(respuesta) {
  mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => respuesta,
  }))
}

test('POST /api/asistente mapea la respuesta del RAG a { respuesta, fuentes }', async () => {
  mockRag({
    answer: 'Hacemos envíos a todo el país.',
    sources: [
      {
        fuente: '02-envios-y-entregas.txt',
        seccion: '1. ZONAS Y PLAZOS',
        texto: 'texto crudo interno',
        distancia: 0.2,
        similitud: 0.81,
      },
    ],
  })

  const res = await request(app)
    .post('/api/asistente')
    .send({ pregunta: '¿Hacen envíos al interior?' })

  assert.equal(res.status, 200)
  assert.equal(res.body.data.respuesta, 'Hacemos envíos a todo el país.')
  assert.equal(res.body.data.fuentes.length, 1)
  assert.equal(res.body.data.fuentes[0].fuente, '02-envios-y-entregas.txt')
  assert.equal(res.body.data.fuentes[0].seccion, '1. ZONAS Y PLAZOS')
  // No se filtran el texto crudo ni las distancias internas del RAG.
  assert.equal(res.body.data.fuentes[0].texto, undefined)
  assert.equal(res.body.data.fuentes[0].distancia, undefined)
})

test('una pregunta demasiado corta → 400 y ni siquiera consulta al RAG', async () => {
  let consultado = false
  mock.method(global, 'fetch', async () => {
    consultado = true
    return { ok: true, json: async () => ({}) }
  })

  const res = await request(app).post('/api/asistente').send({ pregunta: 'a' })

  assert.equal(res.status, 400)
  assert.equal(consultado, false, 'la validación corta antes de llamar al RAG')
})

test('rechaza campos no declarados (strict) → 400', async () => {
  const res = await request(app)
    .post('/api/asistente')
    .send({ pregunta: '¿Cuál es la garantía?', rol: 'admin' })

  assert.equal(res.status, 400)
})

test('tolera una respuesta del RAG sin fuentes', async () => {
  mockRag({ answer: 'No tengo ese dato en la documentación.' })

  const res = await request(app)
    .post('/api/asistente')
    .send({ pregunta: '¿Cuál es la capital de Marte?' })

  assert.equal(res.status, 200)
  assert.deepEqual(
    res.body.data.fuentes,
    [],
    'sin `sources` la lista queda vacía, no rompe'
  )
})

// Distinto de que el RAG se caiga: acá contesta, pero con un status de error
// (por ejemplo, 500 porque se quedó sin cuota del modelo).
test('si el RAG responde con status de error, también es 502', async () => {
  mock.method(global, 'fetch', async () => ({
    ok: false,
    status: 429,
    json: async () => ({ detail: 'quota exceeded for project 505192322875' }),
  }))

  const res = await request(app)
    .post('/api/asistente')
    .send({ pregunta: '¿Hacen envíos al interior?' })

  assert.equal(res.status, 502)
  assert.doesNotMatch(
    JSON.stringify(res.body),
    /quota|505192322875/,
    'ni la cuota ni el id del proyecto deben llegar al navegador'
  )
})

test('si el RAG se cae, responde 502 sin filtrar el error interno', async () => {
  mock.method(global, 'fetch', async () => {
    throw new Error('ECONNREFUSED 127.0.0.1:8000')
  })

  const res = await request(app)
    .post('/api/asistente')
    .send({ pregunta: '¿Hacen envíos al interior?' })

  assert.equal(res.status, 502)
  assert.ok(res.body.message)
  assert.ok(
    !res.body.message.includes('ECONNREFUSED'),
    'el detalle del upstream no debe llegar al cliente'
  )
})
