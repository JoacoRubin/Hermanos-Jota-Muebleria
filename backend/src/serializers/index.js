/**
 * Única fuente de verdad de la forma que tienen las respuestas de la API.
 *
 * Existe por una razón concreta: la auditoría encontró cuatro bugs distintos
 * (`id` vs `_id`, `role` vs `rol`, `createdAt` vs `fechaPedido`, `nombre` vs
 * `name`) que tenían la misma causa —cada endpoint inventaba su propio
 * contrato—. Si el frontend solo consume lo que sale de acá, esa clase de bug
 * deja de ser posible.
 *
 * Convención: el identificador público SIEMPRE se llama `id`. Nunca `_id`.
 *
 * Y ahora también es la frontera de privacidad del inventario: el stock exacto
 * solo cruza esta capa si el que pregunta es un administrador. Ver
 * `serializeProduct`.
 */

const { calcularEstadoStock } = require('../utils/stock')
const { ESTADOS_CANCELABLES_CLIENTE } = require('../constants')

function toId(value) {
  if (!value) return null
  return typeof value === 'object' && value._id ? value._id.toString() : value.toString()
}

function serializeUser(user) {
  if (!user) return null
  return {
    id: toId(user._id),
    nombre: user.nombre,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }
}

/**
 * @param {object} product documento (hidratado o `.lean()`)
 * @param {{ incluirStock?: boolean }} opciones
 *
 * `incluirStock` es `false` POR DEFECTO, y eso es deliberado: si algún
 * endpoint futuro se olvida de pasar la opción, el error es no mostrarle el
 * número al admin (molesto, visible, se arregla en un minuto), no filtrárselo
 * al mundo (silencioso, y nadie se entera nunca). El default seguro es el que
 * falla del lado correcto.
 */
function serializeProduct(product, { incluirStock = false } = {}) {
  if (!product) return null

  // `detalles` es un Map en el documento hidratado y un objeto plano cuando
  // la query usó `.lean()`. Se normaliza a objeto plano en los dos casos.
  const detalles =
    product.detalles instanceof Map
      ? Object.fromEntries(product.detalles)
      : product.detalles || {}

  const { stockStatus, disponible, lowStockMessage, unidadesRestantes } =
    calcularEstadoStock(product.stock)

  return {
    id: toId(product._id),
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio: product.precio,
    categoria: product.categoria,
    imagenUrl: product.imagenUrl,
    detalles,

    // ── Lo que ve todo el mundo ──────────────────────────────────────────
    // Tres campos derivados en lugar de un número. El cliente no puede
    // reconstruir el stock a partir de esto salvo cuando ya se lo estamos
    // diciendo con todas las letras ("Últimas 2 unidades").
    stockStatus,
    disponible,
    lowStockMessage,
    unidadesRestantes,

    // ── Solo administradores ─────────────────────────────────────────────
    // La clave ni siquiera aparece en el JSON del cliente: no es `stock: null`
    // —que ya delata que el campo existe y está oculto—, directamente no está.
    ...(incluirStock ? { stock: product.stock } : {}),

    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

function serializeOrderItem(item) {
  return {
    productoId: toId(item.producto),
    nombre: item.nombre,
    precio: item.precio,
    cantidad: item.cantidad,
    imagenUrl: item.imagenUrl || '',
    subtotal: item.precio * item.cantidad,
  }
}

function serializeStatusEntry(entrada) {
  return {
    estado: entrada.estado,
    fecha: entrada.fecha,
    rol: entrada.rol || 'sistema',
    // Se expone quién lo hizo solo si vino poblado; si no, el id pelado.
    usuario:
      entrada.usuario && entrada.usuario.nombre
        ? serializeUser(entrada.usuario)
        : entrada.usuario
          ? { id: toId(entrada.usuario) }
          : null,
    nota: entrada.nota || '',
  }
}

function serializeOrder(order) {
  if (!order) return null

  const items = (order.items || []).map(serializeOrderItem)
  const historial = (order.historialEstados || []).map(serializeStatusEntry)

  return {
    id: toId(order._id),
    // Si vino poblado, se expone el usuario; si no, solo el id.
    usuario:
      order.usuario && order.usuario.nombre
        ? serializeUser(order.usuario)
        : { id: toId(order.usuario) },
    items,
    cantidadTotal: items.reduce((sum, item) => sum + item.cantidad, 0),
    total: order.total,
    estado: order.estado,
    historialEstados: historial,
    seguimiento: {
      numero: order.seguimiento?.numero || '',
      transportista: order.seguimiento?.transportista || '',
    },
    /**
     * Se calcula en el servidor y se manda listo.
     *
     * El cliente PODRÍA deducirlo del estado con su copia de las constantes,
     * pero entonces la regla viviría en dos lugares y un día se separarían.
     * Esto es solo para pintar el botón: el permiso real lo revalida
     * `POST /api/orders/:id/cancelar` antes de tocar nada.
     */
    puedeCancelarCliente:
      ESTADOS_CANCELABLES_CLIENTE.includes(order.estado) &&
      !order.stockDevueltoAt,
    direccionEnvio: order.direccionEnvio,
    notas: order.notas || '',
    motivoCancelacion: order.motivoCancelacion || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

function serializeStockMovement(movimiento) {
  if (!movimiento) return null
  return {
    id: toId(movimiento._id),
    productoId: toId(movimiento.producto),
    nombreProducto: movimiento.nombreProducto,
    cantidad: movimiento.cantidad,
    motivo: movimiento.motivo,
    stockResultante: movimiento.stockResultante,
    pedidoId: movimiento.pedido ? toId(movimiento.pedido) : null,
    usuario:
      movimiento.usuario && movimiento.usuario.nombre
        ? serializeUser(movimiento.usuario)
        : movimiento.usuario
          ? { id: toId(movimiento.usuario) }
          : null,
    nota: movimiento.nota || '',
    createdAt: movimiento.createdAt,
  }
}

function serializeContactMessage(consulta) {
  if (!consulta) return null
  return {
    id: toId(consulta._id),
    nombre: consulta.nombre,
    email: consulta.email,
    mensaje: consulta.mensaje,
    estado: consulta.estado,
    createdAt: consulta.createdAt,
  }
}

module.exports = {
  serializeUser,
  serializeProduct,
  serializeOrder,
  serializeOrderItem,
  serializeStockMovement,
  serializeContactMessage,
}
