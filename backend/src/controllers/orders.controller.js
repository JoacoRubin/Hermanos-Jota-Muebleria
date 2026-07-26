const Order = require('../models/Order')
const Product = require('../models/Product')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { serializeOrder } = require('../serializers')
const { buildMeta, skipFor } = require('../utils/pagination')
const { validated } = require('../middleware/validate')
const {
  reservarStock,
  liberarReserva,
  registrarVenta,
  devolverStockDePedido,
} = require('../services/stock.service')
const {
  ESTADO_PEDIDO_INICIAL,
  ESTADOS_CANCELABLES_CLIENTE,
  ESTADOS_CANCELABLES_ADMIN,
  GRUPOS_MIS_PEDIDOS,
  esTransicionValida,
  TRANSICIONES_PEDIDO,
} = require('../constants')

/** Evita la deriva del punto flotante al sumar importes. */
const redondear = (valor) => Math.round(valor * 100) / 100

/**
 * Une los ítems repetidos del carrito en uno solo.
 *
 * Sin esto, mandar el mismo producto dos veces con cantidad 3 esquiva el
 * tope por ítem y descuenta stock en dos pasos independientes.
 */
function agruparItems(items) {
  const porProducto = new Map()

  for (const item of items) {
    const actual = porProducto.get(item.producto) || 0
    porProducto.set(item.producto, actual + item.cantidad)
  }

  return [...porProducto.entries()].map(([producto, cantidad]) => ({
    producto,
    cantidad,
  }))
}

/** Una entrada del historial, con quién la provocó. */
function entradaHistorial(estado, actor, nota = '') {
  return {
    estado,
    fecha: new Date(),
    usuario: actor?.id ?? null,
    rol: actor?.role ?? 'sistema',
    nota,
  }
}

/**
 * Traduce el fallo de una reserva en el error correcto para el cliente.
 *
 * OJO CON EL MENSAJE: la versión anterior decía
 * `Disponible: ${existe.stock}, solicitado: ${item.cantidad}`.
 * Eso filtraba el stock exacto por la puerta de atrás: bastaba pedir 9999
 * unidades de cualquier producto para que el 409 te contestara cuántas hay.
 * Todo el trabajo del serializer se caía por un mensaje de error.
 */
async function errorDeReserva({ productoId, cantidad }) {
  const existe = await Product.findById(productoId).select('nombre stock').lean()

  if (!existe) {
    return ApiError.badRequest(
      `El producto ${productoId} no existe o fue dado de baja`
    )
  }

  return ApiError.conflict(
    existe.stock === 0
      ? `"${existe.nombre}" está sin stock`
      : `No hay stock suficiente de "${existe.nombre}" para las ${cantidad} unidades pedidas`
  )
}

// @desc    Crear un pedido
// @route   POST /api/orders
// @access  Privado
exports.createOrder = asyncHandler(async (req, res) => {
  const { items, direccionEnvio, notas } = req.body

  const itemsAgrupados = agruparItems(items)
  const { ok, reservados, fallo } = await reservarStock(itemsAgrupados)

  if (!ok) {
    // Compensación: lo ya descontado se devuelve. Sin esto, un pedido que
    // falla a la mitad deja stock "fantasma" reservado para siempre.
    await liberarReserva(reservados)
    throw await errorDeReserva(fallo)
  }

  try {
    // ────────────────────────────────────────────────────────────────
    // ACÁ ESTÁ EL PUNTO. `precio`, `nombre` e `imagenUrl` salen del
    // documento de la base, NO del request. El cliente solo pudo elegir
    // QUÉ producto y CUÁNTAS unidades; el valor lo pone el servidor.
    // ────────────────────────────────────────────────────────────────
    const itemsPedido = reservados.map(({ producto, cantidad }) => ({
      producto: producto._id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagenUrl: producto.imagenUrl || '',
      cantidad,
    }))

    const total = redondear(
      itemsPedido.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
    )

    const order = await Order.create({
      usuario: req.user.id,
      items: itemsPedido,
      total,
      direccionEnvio,
      notas,
      estado: ESTADO_PEDIDO_INICIAL,
      // El historial arranca con el pedido: sin esta primera entrada la línea
      // de tiempo del cliente no tiene de dónde sacar la fecha del paso 1.
      historialEstados: [
        entradaHistorial(ESTADO_PEDIDO_INICIAL, null, 'Pedido recibido'),
      ],
    })

    // Recién ahora se asienta la venta en el libro mayor: con el pedido ya
    // creado y con su id, que es lo que hace el movimiento rastreable.
    await registrarVenta({ order, reservados, usuarioId: req.user.id })

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      data: serializeOrder(order),
    })
  } catch (error) {
    await liberarReserva(reservados)
    throw error
  }
})

// @desc    Pedidos del usuario autenticado
// @route   GET /api/orders/mis-pedidos
// @access  Privado
exports.getUserOrders = asyncHandler(async (req, res) => {
  const { page, limit, estado, grupo } = validated(req, 'query')

  const filtro = { usuario: req.user.id }

  // `grupo` son las pestañas de la pantalla (pendientes / entregados /
  // cancelados) y `estado` es el filtro fino. Se resuelven en el servidor:
  // traer todo y filtrar en el navegador rompe la paginación —la página 1 de
  // "cancelados" saldría de los 20 pedidos más recientes de cualquier estado.
  if (grupo) filtro.estado = { $in: [...GRUPOS_MIS_PEDIDOS[grupo]] }
  if (estado) filtro.estado = estado

  const [orders, total] = await Promise.all([
    Order.find(filtro)
      .sort({ createdAt: -1 })
      .skip(skipFor({ page, limit }))
      .limit(limit)
      .lean(),
    Order.countDocuments(filtro),
  ])

  res.json({
    data: orders.map(serializeOrder),
    meta: buildMeta({ page, limit, total }),
  })
})

// @desc    Obtener un pedido
// @route   GET /api/orders/:id
// @access  Privado (dueño o admin)
exports.getOrderById = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')

  const order = await Order.findById(id)
    .populate('usuario', 'nombre email role')
    .populate('historialEstados.usuario', 'nombre email role')
  if (!order) throw ApiError.notFound('Pedido no encontrado')

  const ownerId = order.usuario?._id?.toString() ?? order.usuario?.toString()
  const esDueno = ownerId === req.user.id
  const esAdmin = req.user.role === 'admin'

  if (!esDueno && !esAdmin) {
    throw ApiError.forbidden('No tenés permiso para ver este pedido')
  }

  res.json({ data: serializeOrder(order) })
})

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CANCELACIÓN: EL CLAIM ATÓMICO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Cancelar hace dos cosas: marcar el pedido y devolver las unidades. El peligro
 * no es que falle, es que ocurra DOS VECES —doble click, reintento del cliente
 * HTTP, dos pestañas, el admin y el cliente cancelando a la vez—. Devolver el
 * stock dos veces infla el inventario con unidades que no existen, y eso
 * después se vende.
 *
 * Leer el pedido, ver que no está cancelado y después cancelarlo NO alcanza:
 * entre la lectura y la escritura entra el otro request y los dos creen que
 * ganaron. Es el mismo TOCTOU que el del stock.
 *
 * La solución es la misma: la condición viaja DENTRO del update. El filtro
 * exige el estado cancelable Y `stockDevueltoAt: null`. MongoDB resuelve un
 * único documento de forma atómica, así que de N intentos simultáneos
 * exactamente UNO recibe el documento y los demás reciben `null`. El que
 * recibió el documento es el único autorizado a devolver el stock.
 *
 * NOTA SOBRE EL ORDEN: `stockDevueltoAt` se sella ANTES de devolver las
 * unidades, no después. Si el proceso se cae en el medio, el resultado es
 * stock que no volvió (faltante, detectable comparando contra el libro mayor)
 * y no stock devuelto dos veces (sobrante, que se vende y no se puede
 * entregar). Ante la duda, se falla para el lado que no promete lo que no hay.
 */
async function reclamarCancelacion({ orderId, estadosPermitidos, actor, motivo }) {
  const filtro = {
    _id: orderId,
    estado: { $in: [...estadosPermitidos] },
    // El segundo cerrojo. Redundante con el estado en el caso feliz, y ese es
    // justamente el punto: si un bug futuro deja un pedido cancelado en otro
    // estado, esto sigue impidiendo la doble devolución.
    stockDevueltoAt: null,
  }

  // Un no-admin solo puede cancelar lo suyo. El permiso ya se verificó arriba;
  // esto lo vuelve a exigir en la propia condición del update, para que ni
  // siquiera una carrera pueda cancelar el pedido de otro.
  if (actor.role !== 'admin') filtro.usuario = actor.id

  return Order.findOneAndUpdate(
    filtro,
    {
      $set: {
        estado: 'cancelado',
        stockDevueltoAt: new Date(),
        canceladoPor: actor.id,
        motivoCancelacion: motivo || '',
      },
      $push: {
        historialEstados: entradaHistorial('cancelado', actor, motivo || ''),
      },
    },
    { new: true }
  )
}

/** Explica por qué el claim no se pudo ganar, sin filtrar datos ajenos. */
function errorDeCancelacion(order, estadosPermitidos) {
  if (order.estado === 'cancelado') {
    return ApiError.conflict('El pedido ya estaba cancelado')
  }

  if (!estadosPermitidos.includes(order.estado)) {
    return ApiError.conflict(
      `Un pedido en estado "${order.estado}" ya no se puede cancelar`
    )
  }

  // Estado cancelable pero `stockDevueltoAt` con valor: otro request ganó la
  // carrera hace milisegundos, o hay un pedido en un estado inconsistente.
  return ApiError.conflict(
    'El pedido ya tiene su stock devuelto y no se puede volver a cancelar'
  )
}

/** Cancela y devuelve stock. Compartido por el endpoint del cliente y el admin. */
async function ejecutarCancelacion({ orderId, actor, motivo }) {
  const order = await Order.findById(orderId)
  if (!order) throw ApiError.notFound('Pedido no encontrado')

  const esAdmin = actor.role === 'admin'
  const ownerId = order.usuario?.toString()

  if (!esAdmin && ownerId !== actor.id) {
    throw ApiError.forbidden('No tenés permiso para cancelar este pedido')
  }

  const estadosPermitidos = esAdmin
    ? ESTADOS_CANCELABLES_ADMIN
    : ESTADOS_CANCELABLES_CLIENTE

  const cancelado = await reclamarCancelacion({
    orderId,
    estadosPermitidos,
    actor,
    motivo,
  })

  if (!cancelado) {
    // Se relee para dar un motivo preciso. Que el claim fallara ya garantiza
    // que este request NO va a tocar el stock, así que la relectura es solo
    // para el mensaje.
    const actualizado = await Order.findById(orderId).lean()
    if (!actualizado) throw ApiError.notFound('Pedido no encontrado')
    throw errorDeCancelacion(actualizado, estadosPermitidos)
  }

  // Ganamos el claim: somos los únicos que van a devolver estas unidades.
  await devolverStockDePedido({ order: cancelado, usuarioId: actor.id })

  return cancelado
}

// @desc    Cancelar un pedido (devuelve el stock)
// @route   POST /api/orders/:id/cancelar
// @access  Privado (dueño en estados cancelables, o admin)
exports.cancelOrder = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')
  const { motivo } = req.body

  const order = await ejecutarCancelacion({
    orderId: id,
    actor: req.user,
    motivo,
  })

  res.json({
    message: 'Pedido cancelado. Las unidades volvieron al stock.',
    data: serializeOrder(order),
  })
})

// @desc    Cambiar el estado de un pedido
// @route   PUT /api/orders/:id/estado
// @access  Privado / Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')
  const { estado, nota, seguimiento } = req.body

  // Cancelar tiene consecuencias sobre el inventario, así que no se resuelve
  // acá: se delega en el mismo camino que usa el cliente. Un solo lugar que
  // devuelve stock significa un solo lugar donde puede estar el bug.
  if (estado === 'cancelado') {
    const cancelado = await ejecutarCancelacion({
      orderId: id,
      actor: req.user,
      motivo: nota,
    })

    return res.json({
      message: 'Pedido cancelado. Las unidades volvieron al stock.',
      data: serializeOrder(cancelado),
    })
  }

  const order = await Order.findById(id)
  if (!order) throw ApiError.notFound('Pedido no encontrado')

  const estadoAnterior = order.estado

  if (estadoAnterior === estado) {
    return res.json({
      message: 'El pedido ya estaba en ese estado',
      data: serializeOrder(order),
    })
  }

  // ────────────────────────────────────────────────────────────────────────
  // La validación que antes no existía.
  //
  // El schema de zod verifica que `estado` sea un valor del enum. Eso deja
  // pasar "despachar un pedido cancelado" o "volver un entregado a pendiente":
  // valores legales, transiciones absurdas. Un enum dice qué existe; el mapa
  // de transiciones dice qué es alcanzable desde dónde.
  // ────────────────────────────────────────────────────────────────────────
  if (!esTransicionValida(estadoAnterior, estado)) {
    const posibles = TRANSICIONES_PEDIDO[estadoAnterior] || []
    throw ApiError.conflict(
      posibles.length === 0
        ? `"${estadoAnterior}" es un estado final: el pedido ya no puede cambiar`
        : `No se puede pasar de "${estadoAnterior}" a "${estado}". ` +
            `Desde "${estadoAnterior}" solo se puede ir a: ${posibles.join(', ')}`
    )
  }

  order.estado = estado
  order.historialEstados.push(entradaHistorial(estado, req.user, nota || ''))

  // El seguimiento se carga al despachar y es opcional: puede no haber número
  // de tracking todavía. Solo se pisa lo que vino, para que un despacho sin
  // datos no borre los que ya estaban cargados.
  if (seguimiento) {
    if (seguimiento.numero !== undefined) {
      order.seguimiento.numero = seguimiento.numero
    }
    if (seguimiento.transportista !== undefined) {
      order.seguimiento.transportista = seguimiento.transportista
    }
  }

  await order.save()

  res.json({
    message: `Pedido actualizado a "${estado}"`,
    data: serializeOrder(order),
  })
})

// @desc    Listar todos los pedidos
// @route   GET /api/orders/admin/all
// @access  Privado / Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, estado, grupo } = validated(req, 'query')

  const filtro = {}
  if (grupo) filtro.estado = { $in: [...GRUPOS_MIS_PEDIDOS[grupo]] }
  if (estado) filtro.estado = estado

  const [orders, total] = await Promise.all([
    Order.find(filtro)
      .sort({ createdAt: -1 })
      .skip(skipFor({ page, limit }))
      .limit(limit)
      .populate('usuario', 'nombre email role')
      .lean(),
    Order.countDocuments(filtro),
  ])

  res.json({
    data: orders.map(serializeOrder),
    meta: buildMeta({ page, limit, total }),
  })
})
