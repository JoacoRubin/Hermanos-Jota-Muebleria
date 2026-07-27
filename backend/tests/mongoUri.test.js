const test = require('node:test')
const assert = require('node:assert/strict')

const { esBaseLocal, hostDe } = require('../src/utils/mongoUri')

/**
 * Estos tests protegen una guarda destructiva.
 *
 * `esBaseLocal` decide si `npm run seed -- --force` puede borrar el catálogo
 * sin preguntar. Un falso positivo acá no rompe un test funcional: borra datos
 * reales y te enterás después.
 */

test('reconoce las bases locales', () => {
  const locales = [
    'mongodb://localhost:27017/hermanos-jota',
    'mongodb://127.0.0.1:27017/hermanos-jota',
    'mongodb://localhost/hermanos-jota',
    'mongodb://usuario:clave@localhost:27017/hermanos-jota',
    'mongodb://[::1]:27017/hermanos-jota',
  ]

  for (const uri of locales) {
    assert.equal(esBaseLocal(uri), true, `debería ser local: ${uri}`)
  }
})

test('Atlas NUNCA es local', () => {
  const remotas = [
    'mongodb+srv://user:pass@cluster0.jo6svin.mongodb.net/hermanos-jota',
    'mongodb+srv://user:pass@cluster0.jo6svin.mongodb.net/hermanos-jota-dev?appName=Cluster0',
    'mongodb://user:pass@ac-orsixcl-shard-00-00.jo6svin.mongodb.net:27017/hj',
  ]

  for (const uri of remotas) {
    assert.equal(esBaseLocal(uri), false, `debería ser remota: ${uri}`)
  }
})

test('una contraseña que contenga "localhost" no engaña a la guarda', () => {
  // El host se lee después del ÚLTIMO `@`, así que una credencial con
  // caracteres raros no puede hacerse pasar por el host.
  const uri = 'mongodb+srv://admin:localhost@cluster0.jo6svin.mongodb.net/hj'

  assert.equal(hostDe(uri), 'cluster0.jo6svin.mongodb.net')
  assert.equal(esBaseLocal(uri), false)
})

test('con varios hosts, alcanza uno remoto para tratarla como remota', () => {
  const uri = 'mongodb://localhost:27017,servidor-remoto:27017/hj'
  assert.equal(esBaseLocal(uri), false)
})

test('ante una URI ilegible, asume remota', () => {
  // El default seguro: equivocarse hacia "remota" cuesta un flag de más;
  // equivocarse hacia "local" cuesta el catálogo.
  for (const valor of ['', null, undefined, 'cualquier cosa', 42]) {
    assert.equal(
      esBaseLocal(valor),
      false,
      `${String(valor)} no debería habilitar un borrado`
    )
  }
})

test('hostDe extrae el host sin credenciales ni base ni query', () => {
  assert.equal(
    hostDe('mongodb+srv://u:p@cluster0.jo6svin.mongodb.net/hj?appName=X'),
    'cluster0.jo6svin.mongodb.net'
  )
  assert.equal(hostDe('mongodb://localhost:27017/hj'), 'localhost:27017')
})

test('hostDe nunca devuelve la contraseña', () => {
  const uri = 'mongodb+srv://admin:SuperSecreto123@cluster0.mongodb.net/hj'
  assert.equal(hostDe(uri).includes('SuperSecreto123'), false)
})
