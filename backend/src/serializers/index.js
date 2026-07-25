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
 */

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

function serializeProduct(product) {
  if (!product) return null

  // `detalles` es un Map en el documento hidratado y un objeto plano cuando
  // la query usó `.lean()`. Se normaliza a objeto plano en los dos casos.
  const detalles =
    product.detalles instanceof Map
      ? Object.fromEntries(product.detalles)
      : product.detalles || {}

  return {
    id: toId(product._id),
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio: product.precio,
    stock: product.stock,
    categoria: product.categoria,
    imagenUrl: product.imagenUrl,
    detalles,
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

function serializeOrder(order) {
  if (!order) return null

  const items = (order.items || []).map(serializeOrderItem)

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
    direccionEnvio: order.direccionEnvio,
    notas: order.notas || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
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
  serializeContactMessage,
}
