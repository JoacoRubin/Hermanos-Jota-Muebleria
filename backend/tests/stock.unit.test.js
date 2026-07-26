const test = require('node:test')
const assert = require('node:assert/strict')

const { calcularEstadoStock } = require('../src/utils/stock')
const {
  UMBRAL_STOCK_BAJO,
  esTransicionValida,
  TRANSICIONES_PEDIDO,
  ESTADOS_PEDIDO,
} = require('../src/constants')

/**
 * Tests puros: sin base, sin app, sin supertest.
 *
 * `calcularEstadoStock` y `esTransicionValida` son funciones sin dependencias
 * justamente para poder probarlas así. Si para verificar el texto "Últimas 2
 * unidades" hubiera que levantar MongoDB y autenticar un usuario, la lógica
 * estaría en el lugar equivocado.
 */

// ─────────────────────────────────────────────────────────────────────────────
// El aviso de escasez
// ─────────────────────────────────────────────────────────────────────────────

test('3 unidades → "Últimas 3 unidades"', () => {
  const resultado = calcularEstadoStock(3)
  assert.equal(resultado.lowStockMessage, 'Últimas 3 unidades')
  assert.equal(resultado.stockStatus, 'ultimas')
  assert.equal(resultado.disponible, true)
})

test('2 unidades → "Últimas 2 unidades"', () => {
  assert.equal(calcularEstadoStock(2).lowStockMessage, 'Últimas 2 unidades')
})

test('1 unidad → singular, no "Últimas 1 unidades"', () => {
  const resultado = calcularEstadoStock(1)
  assert.equal(resultado.lowStockMessage, 'Última unidad disponible')
  assert.equal(resultado.stockStatus, 'ultimas')
})

test('0 unidades → "Sin stock" y no disponible', () => {
  const resultado = calcularEstadoStock(0)
  assert.equal(resultado.lowStockMessage, 'Sin stock')
  assert.equal(resultado.stockStatus, 'agotado')
  assert.equal(resultado.disponible, false)
})

test('por encima del umbral no hay aviso ni número', () => {
  const resultado = calcularEstadoStock(UMBRAL_STOCK_BAJO + 1)

  assert.equal(resultado.stockStatus, 'disponible')
  assert.equal(resultado.lowStockMessage, null)
  assert.equal(
    resultado.unidadesRestantes,
    null,
    'arriba del umbral el cliente no puede deducir cuántas unidades hay'
  )
})

test('el umbral es exactamente UMBRAL_STOCK_BAJO, no uno más ni uno menos', () => {
  assert.equal(calcularEstadoStock(UMBRAL_STOCK_BAJO).stockStatus, 'ultimas')
  assert.equal(
    calcularEstadoStock(UMBRAL_STOCK_BAJO + 1).stockStatus,
    'disponible'
  )
})

test('un stock inválido se trata como agotado, no como infinito', () => {
  // La opción segura ante un dato roto es no prometer una unidad que no está.
  for (const valor of [null, undefined, NaN, -5, 'muchas']) {
    const resultado = calcularEstadoStock(valor)
    assert.equal(
      resultado.stockStatus,
      'agotado',
      `${String(valor)} debería tratarse como agotado`
    )
    assert.equal(resultado.disponible, false)
  }
})

test('solo se revela el número cuando el aviso ya lo dice en castellano', () => {
  // Invariante de privacidad: `unidadesRestantes` no puede tener un valor
  // "útil" si no hay aviso de escasez. Si esto se rompe, hay una fuga.
  for (let stock = 0; stock <= 20; stock++) {
    const { stockStatus, unidadesRestantes } = calcularEstadoStock(stock)

    if (stockStatus === 'disponible') {
      assert.equal(
        unidadesRestantes,
        null,
        `con stock ${stock} no se debe exponer la cantidad`
      )
    } else {
      assert.equal(unidadesRestantes, stock)
    }
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// La máquina de estados
// ─────────────────────────────────────────────────────────────────────────────

test('el camino feliz completo es válido paso a paso', () => {
  assert.ok(esTransicionValida('pendiente', 'aceptado'))
  assert.ok(esTransicionValida('aceptado', 'despachado'))
  assert.ok(esTransicionValida('despachado', 'entregado'))
})

test('se puede cancelar desde cualquier estado en curso', () => {
  assert.ok(esTransicionValida('pendiente', 'cancelado'))
  assert.ok(esTransicionValida('aceptado', 'cancelado'))
  assert.ok(esTransicionValida('despachado', 'cancelado'))
})

test('no se puede saltear pasos del flujo', () => {
  assert.equal(esTransicionValida('pendiente', 'despachado'), false)
  assert.equal(esTransicionValida('pendiente', 'entregado'), false)
  assert.equal(esTransicionValida('aceptado', 'entregado'), false)
})

test('no se puede retroceder', () => {
  assert.equal(esTransicionValida('aceptado', 'pendiente'), false)
  assert.equal(esTransicionValida('despachado', 'aceptado'), false)
  assert.equal(esTransicionValida('entregado', 'despachado'), false)
})

test('un pedido cancelado es terminal: no se despacha ni se entrega', () => {
  assert.equal(esTransicionValida('cancelado', 'despachado'), false)
  assert.equal(esTransicionValida('cancelado', 'entregado'), false)
  assert.equal(esTransicionValida('cancelado', 'pendiente'), false)
  assert.deepEqual(TRANSICIONES_PEDIDO.cancelado, [])
})

test('un pedido entregado es terminal, ni siquiera se cancela', () => {
  assert.equal(esTransicionValida('entregado', 'cancelado'), false)
  assert.deepEqual(TRANSICIONES_PEDIDO.entregado, [])
})

test('ningún estado transiciona a sí mismo', () => {
  for (const estado of ESTADOS_PEDIDO) {
    assert.equal(
      esTransicionValida(estado, estado),
      false,
      `${estado} no debería poder transicionar a sí mismo`
    )
  }
})

test('el mapa de transiciones cubre todos los estados y no inventa ninguno', () => {
  assert.deepEqual(
    Object.keys(TRANSICIONES_PEDIDO).sort(),
    [...ESTADOS_PEDIDO].sort(),
    'todo estado del enum necesita una entrada en el mapa'
  )

  for (const [origen, destinos] of Object.entries(TRANSICIONES_PEDIDO)) {
    for (const destino of destinos) {
      assert.ok(
        ESTADOS_PEDIDO.includes(destino),
        `${origen} apunta a "${destino}", que no es un estado válido`
      )
    }
  }
})

test('un estado desconocido no habilita ninguna transición', () => {
  assert.equal(esTransicionValida('inventado', 'entregado'), false)
  assert.equal(esTransicionValida(undefined, 'aceptado'), false)
})
