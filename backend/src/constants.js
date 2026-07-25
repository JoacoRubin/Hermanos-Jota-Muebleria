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

const ESTADOS_PEDIDO = Object.freeze([
  'pendiente',
  'procesando',
  'enviado',
  'entregado',
  'cancelado',
])

const ESTADOS_CONSULTA = Object.freeze(['nueva', 'leida', 'respondida'])

const ROLES = Object.freeze(['user', 'admin'])

// Techo defensivo: sin esto, un pedido puede pedir 9.999.999 unidades y
// desbordar el cálculo del total.
const MAX_CANTIDAD_POR_ITEM = 100
const MAX_ITEMS_POR_PEDIDO = 50

module.exports = {
  CATEGORIAS,
  ESTADOS_PEDIDO,
  ESTADOS_CONSULTA,
  ROLES,
  MAX_CANTIDAD_POR_ITEM,
  MAX_ITEMS_POR_PEDIDO,
}
