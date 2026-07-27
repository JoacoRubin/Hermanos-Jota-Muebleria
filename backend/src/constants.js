/**
 * Vocabulario del dominio en un solo lugar.
 *
 * Los schemas de Mongoose, los schemas de zod y el seed leen de acá. Si mañana
 * se agrega una categoría, se agrega UNA vez.
 */
const CATEGORIAS = Object.freeze([
  'Sillas',
  'Mesas',
  'Sofás',
  'Camas',
  'Escritorios',
  'Estanterías',
  'Almacenamiento',
  'Otros',
])

// ─── Pedidos: estados y máquina de transiciones ─────────────────────────────

/**
 * El camino feliz de un pedido, en orden. Se usa para dibujar la línea de
 * tiempo del cliente: los pasos anteriores al estado actual están completados,
 * los siguientes están pendientes.
 *
 * `cancelado` NO está acá porque no es un paso del recorrido: es una salida.
 */
const FLUJO_PEDIDO = Object.freeze([
  'pendiente',
  'aceptado',
  'despachado',
  'entregado',
])

const ESTADO_PEDIDO_INICIAL = 'pendiente'

const ESTADOS_PEDIDO = Object.freeze([...FLUJO_PEDIDO, 'cancelado'])

/**
 * Única definición de qué transición es legal.
 *
 * Antes no existía: `updateOrderStatus` aceptaba cualquier valor del enum, así
 * que un pedido cancelado se podía "despachar" y uno entregado volver a
 * `pendiente`. Un enum dice qué valores EXISTEN; no dice cuáles se pueden
 * alcanzar desde dónde. Eso es lo que define este mapa.
 *
 * `entregado` y `cancelado` son terminales: array vacío, no se sale de ahí.
 */
const TRANSICIONES_PEDIDO = Object.freeze({
  pendiente: Object.freeze(['aceptado', 'cancelado']),
  aceptado: Object.freeze(['despachado', 'cancelado']),
  despachado: Object.freeze(['entregado', 'cancelado']),
  entregado: Object.freeze([]),
  cancelado: Object.freeze([]),
})

/**
 * Hasta dónde puede cancelar cada rol.
 *
 * El cliente corta en `aceptado`: una vez que el mueble salió del depósito la
 * cancelación deja de ser un click y pasa a ser una gestión. El admin sí puede
 * cancelar un despacho, porque es quien puede recuperarlo físicamente.
 */
const ESTADOS_CANCELABLES_CLIENTE = Object.freeze(['pendiente', 'aceptado'])
const ESTADOS_CANCELABLES_ADMIN = Object.freeze([
  'pendiente',
  'aceptado',
  'despachado',
])

/** Agrupación de "Mis pedidos": en curso / entregados / cancelados. */
const GRUPOS_MIS_PEDIDOS = Object.freeze({
  pendientes: Object.freeze(['pendiente', 'aceptado', 'despachado']),
  entregados: Object.freeze(['entregado']),
  cancelados: Object.freeze(['cancelado']),
})

/**
 * ¿Puede `origen` convertirse en `destino`?
 *
 * Es una función y no un `includes` suelto para que la respuesta se calcule en
 * un único lugar y los tests puedan apuntarle directo, sin levantar la app.
 */
function esTransicionValida(origen, destino) {
  return (TRANSICIONES_PEDIDO[origen] || []).includes(destino)
}

// ─── Stock ──────────────────────────────────────────────────────────────────

/**
 * A partir de cuántas unidades se avisa "últimas N".
 *
 * Es EL número del aviso de escasez y vive solo acá (y en su espejo del
 * cliente). Nada más lo hardcodea: `utils/stock.js` lo lee de este módulo y
 * el frontend consume el mensaje ya calculado por el servidor.
 */
const UMBRAL_STOCK_BAJO = 3

/**
 * Por qué se movió el stock. Es la columna que hace auditable el inventario:
 * sin un motivo obligatorio, un faltante no se puede explicar.
 *
 *  - `reposicion`  el admin agregó unidades
 *  - `venta`       un pedido reservó unidades
 *  - `cancelacion` un pedido cancelado las devolvió
 *  - `ajuste`      corrección manual (edición directa del stock del producto)
 */
const MOTIVOS_MOVIMIENTO_STOCK = Object.freeze([
  'reposicion',
  'venta',
  'cancelacion',
  'ajuste',
])

/** Techo por reposición: escribir 100000 en vez de 100 no debería ser posible. */
const MAX_REPOSICION_POR_MOVIMIENTO = 10_000

const ESTADOS_CONSULTA = Object.freeze(['nueva', 'leida', 'respondida'])

const ROLES = Object.freeze(['user', 'admin'])

// Techo defensivo: sin esto, un pedido puede pedir 9.999.999 unidades y
// desbordar el cálculo del total.
const MAX_CANTIDAD_POR_ITEM = 100
const MAX_ITEMS_POR_PEDIDO = 50

// `FLUJO_PEDIDO` no se exporta: acá solo sirve para derivar `ESTADOS_PEDIDO`.
// El orden del recorrido lo necesita la línea de tiempo, que es del cliente y
// tiene su propia copia en `client/src/constants.js`.
module.exports = {
  CATEGORIAS,
  ESTADO_PEDIDO_INICIAL,
  ESTADOS_PEDIDO,
  TRANSICIONES_PEDIDO,
  ESTADOS_CANCELABLES_CLIENTE,
  ESTADOS_CANCELABLES_ADMIN,
  GRUPOS_MIS_PEDIDOS,
  esTransicionValida,
  UMBRAL_STOCK_BAJO,
  MOTIVOS_MOVIMIENTO_STOCK,
  MAX_REPOSICION_POR_MOVIMIENTO,
  ESTADOS_CONSULTA,
  ROLES,
  MAX_CANTIDAD_POR_ITEM,
  MAX_ITEMS_POR_PEDIDO,
}
