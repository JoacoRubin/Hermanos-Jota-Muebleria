const Order = require('../models/Order')
const Product = require('../models/Product')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { serializeOrder } = require('../serializers')
const { buildMeta, skipFor } = require('../utils/pagination')
const { validated } = require('../middleware/validate')

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

/**
 * Reserva stock de forma atómica, producto por producto.
 *
 * La clave es que la condición `stock: { $gte: cantidad }` viaja DENTRO del
 * update: MongoDB garantiza que la lectura y la escritura de un documento son
 * atómicas, así que dos personas comprando la última butaca al mismo tiempo no
 * pueden ganar las dos. Leer el stock y después escribirlo en dos pasos
 * separados sí permitiría esa carrera.
 *
 * Se eligió este mecanismo en lugar de una transacción porque funciona
 * también contra un MongoDB standalone (las transacciones exigen replica set).
 *
 * Devuelve el documento PREVIO al descuento, que es la fuente de verdad de
 * precio y nombre para el pedido.
 */
async function reservarStock(items) {
  const reservados = []

  try {
    for (const item of items) {
      const producto = await Product.findOneAndUpdate(
        { _id: item.producto, stock: { $gte: item.cantidad } },
        { $inc: { stock: -item.cantidad } },
        { new: false }
      ).lean()

      if (!producto) {
        // O el producto no existe, o no alcanza el stock. Se distingue con
        // una lectura extra para dar un mensaje útil.
        const existe = await Product.findById(item.producto)
          .select('nombre stock')
          .lean()

        throw existe
          ? ApiError.conflict(
              `Stock insuficiente para "${existe.nombre}". Disponible: ${existe.stock}, solicitado: ${item.cantidad}`
            )
          : ApiError.badRequest(
              `El producto ${item.producto} no existe o fue dado de baja`
            )
      }

      reservados.push({ producto, cantidad: item.cantidad })
    }

    return reservados
  } catch (error) {
    // Compensación: lo ya descontado se devuelve. Sin esto, un pedido que
    // falla a la mitad deja stock "fantasma" reservado para siempre.
    await liberarStock(reservados)
    throw error
  }
}

async function liberarStock(reservados) {
  await Promise.all(
    reservados.map(({ producto, cantidad }) =>
      Product.updateOne({ _id: producto._id }, { $inc: { stock: cantidad } })
    )
  )
}

// @desc    Crear un pedido
// @route   POST /api/orders
// @access  Privado
exports.createOrder = asyncHandler(async (req, res) => {
  const { items, direccionEnvio, notas } = req.body

  const itemsAgrupados = agruparItems(items)
  const reservados = await reservarStock(itemsAgrupados)

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
    })

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      data: serializeOrder(order),
    })
  } catch (error) {
    await liberarStock(reservados)
    throw error
  }
})

// @desc    Pedidos del usuario autenticado
// @route   GET /api/orders/mis-pedidos
// @access  Privado
exports.getUserOrders = asyncHandler(async (req, res) => {
  const { page, limit, estado } = validated(req, 'query')

  const filtro = { usuario: req.user.id }
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

  const order = await Order.findById(id).populate('usuario', 'nombre email role')
  if (!order) throw ApiError.notFound('Pedido no encontrado')

  const ownerId = order.usuario?._id?.toString() ?? order.usuario?.toString()
  const esDueno = ownerId === req.user.id
  const esAdmin = req.user.role === 'admin'

  if (!esDueno && !esAdmin) {
    throw ApiError.forbidden('No tenés permiso para ver este pedido')
  }

  res.json({ data: serializeOrder(order) })
})

// @desc    Cambiar el estado de un pedido
// @route   PUT /api/orders/:id/estado
// @access  Privado / Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')
  const { estado } = req.body

  const order = await Order.findById(id)
  if (!order) throw ApiError.notFound('Pedido no encontrado')

  const estadoAnterior = order.estado
  if (estadoAnterior === estado) {
    return res.json({
      message: 'El pedido ya estaba en ese estado',
      data: serializeOrder(order),
    })
  }

  // Cancelar devuelve el stock a la góndola. Si no, cada cancelación
  // dejaría unidades sin vender marcadas como vendidas.
  if (estado === 'cancelado' && estadoAnterior !== 'cancelado') {
    await liberarStock(
      order.items.map((item) => ({
        producto: { _id: item.producto },
        cantidad: item.cantidad,
      }))
    )
  }

  order.estado = estado
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
  const { page, limit, estado } = validated(req, 'query')

  const filtro = {}
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
