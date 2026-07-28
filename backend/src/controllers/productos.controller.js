const Product = require('../models/Product')
const StockMovement = require('../models/StockMovement')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { serializeProduct, serializeStockMovement } = require('../serializers')
const { buildMeta, skipFor } = require('../utils/pagination')
const { validated } = require('../middleware/validate')
const { aplicarMovimiento } = require('../services/stock.service')

/**
 * ¿Le mostramos el número exacto de unidades a quien está preguntando?
 *
 * Solo al admin. `req.user` puede no existir: el catálogo es público y pasa
 * por `optionalAuth`, que no exige sesión.
 */
const puedeVerStock = (req) => req.user?.role === 'admin'

/**
 * Política de caché de las lecturas del catálogo.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO HAY `max-age` MAYOR A CERO
 * ────────────────────────────────────────────────────────────────────────────
 * Antes esto decía `public, max-age=300` cuando la respuesta era pública, y el
 * efecto era el que se reportó: el admin reponía stock y durante CINCO MINUTOS
 * el catálogo seguía mostrando "Sin stock" —para él y para todo el mundo—.
 * El navegador ni siquiera preguntaba: tenía permiso para no hacerlo.
 *
 * `max-age=0, must-revalidate` no apaga la caché, la obliga a revalidar. La
 * respuesta se sigue guardando; lo que cambia es que antes de reusarla hay que
 * preguntar. Express ya emite un ETag por cada `res.json`, así que el navegador
 * manda `If-None-Match` y el server contesta 304 SIN CUERPO cuando nada
 * cambió. Se ahorran los bytes del catálogo entero, que es de donde venía casi
 * todo el beneficio, y desaparece la ventana de datos viejos.
 *
 * Y esto NO depende de `NODE_ENV`. La versión anterior sí, y por eso el bug era
 * invisible en desarrollo: la única forma de encontrarlo era en producción,
 * con un usuario real mirando un producto agotado que ya no lo estaba.
 *
 * Con `incluirStock` la respuesta lleva el número exacto de unidades y no puede
 * guardarse en ningún lado: una caché compartida podría servirle la vista del
 * admin a un anónimo. Ese es el envenenamiento de caché clásico por variar el
 * cuerpo según el rol, y `Vary: Authorization` solo lo mitiga si el
 * intermediario lo respeta. `no-store` no depende de la buena fe de nadie.
 */
function aplicarPoliticaDeCache(res, incluirStock) {
  res.set(
    'Cache-Control',
    incluirStock ? 'no-store' : 'public, max-age=0, must-revalidate'
  )
  // Se declara la dependencia del header igual, para el caso público.
  res.set('Vary', 'Authorization')
}

// @desc    Listar productos (paginado y filtrable)
// @route   GET /api/productos
// @access  Público (el stock exacto, solo para admin)
exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, categoria, buscar, soloDisponibles } = validated(
    req,
    'query'
  )

  const filtro = {}
  if (categoria) filtro.categoria = categoria
  if (soloDisponibles) filtro.stock = { $gt: 0 }
  if (buscar) {
    // `escapeRegExp` no hace falta acá porque no se construye una regex:
    // `$text` usa el índice de texto y trata la entrada como términos.
    filtro.$text = { $search: buscar }
  }

  const [products, total] = await Promise.all([
    Product.find(filtro)
      .sort({ createdAt: -1 })
      .skip(skipFor({ page, limit }))
      .limit(limit)
      .lean()
      .maxTimeMS(10_000),
    Product.countDocuments(filtro).maxTimeMS(10_000),
  ])

  const incluirStock = puedeVerStock(req)

  aplicarPoliticaDeCache(res, incluirStock)

  res.json({
    data: products.map((producto) =>
      serializeProduct(producto, { incluirStock })
    ),
    meta: buildMeta({ page, limit, total }),
  })
})

// @desc    Obtener un producto
// @route   GET /api/productos/:id
// @access  Público (el stock exacto, solo para admin)
exports.getById = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')

  const product = await Product.findById(id).lean()
  if (!product) throw ApiError.notFound('Producto no encontrado')

  const incluirStock = puedeVerStock(req)

  aplicarPoliticaDeCache(res, incluirStock)
  res.json({ data: serializeProduct(product, { incluirStock }) })
})

// @desc    Crear producto
// @route   POST /api/productos
// @access  Privado / Admin
exports.create = asyncHandler(async (req, res) => {
  // `req.body` ya pasó por el schema de zod con `.strict()`: contiene
  // exactamente los campos permitidos y nada más. Por eso acá se puede
  // usar directo sin riesgo de mass assignment.
  const product = await Product.create(req.body)

  // El stock inicial también es un movimiento. Si no se asienta, el libro
  // mayor arranca descuadrado contra `Product.stock` desde el día uno.
  if (product.stock > 0) {
    await StockMovement.create({
      producto: product._id,
      nombreProducto: product.nombre,
      cantidad: product.stock,
      motivo: 'reposicion',
      usuario: req.user.id,
      stockResultante: product.stock,
      nota: 'Stock inicial del alta de producto',
    })
  }

  res.status(201).json({
    message: 'Producto creado exitosamente',
    data: serializeProduct(product, { incluirStock: true }),
  })
})

// @desc    Actualizar producto
// @route   PUT /api/productos/:id
// @access  Privado / Admin
exports.update = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')

  // Se lee el estado previo para poder asentar el ajuste de stock. Ojo: este
  // camino REEMPLAZA el stock, no lo suma, así que dos ediciones simultáneas
  // se pisan. Para agregar unidades está `POST /:id/stock`, que usa `$inc` y
  // es la vía correcta; esto queda para correcciones puntuales.
  const previo = await Product.findById(id).lean()
  if (!previo) throw ApiError.notFound('Producto no encontrado')

  const product = await Product.findByIdAndUpdate(id, req.body, {
    new: true,
    // Sin esto los validadores del schema NO corren en un update y entra
    // `precio: -100` sin protestar. Es el default de Mongoose y es una trampa.
    runValidators: true,
    context: 'query',
  })

  if (!product) throw ApiError.notFound('Producto no encontrado')

  const delta = product.stock - previo.stock
  if (delta !== 0) {
    await StockMovement.create({
      producto: product._id,
      nombreProducto: product.nombre,
      cantidad: delta,
      motivo: 'ajuste',
      usuario: req.user.id,
      stockResultante: product.stock,
      nota: `Edición directa del producto: ${previo.stock} → ${product.stock}`,
    })
  }

  res.json({
    message: 'Producto actualizado',
    data: serializeProduct(product, { incluirStock: true }),
  })
})

// @desc    Agregar unidades al stock (reposición)
// @route   POST /api/productos/:id/stock
// @access  Privado / Admin
exports.agregarStock = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')
  const { cantidad, motivo, nota } = req.body

  // ────────────────────────────────────────────────────────────────────────
  // SUMA, NO REEMPLAZA. Es la diferencia entera de este endpoint.
  //
  // "Poner el stock en 12" obliga al admin a leer el valor actual, hacer la
  // cuenta y escribir el resultado; y si mientras tanto entró una compra, esa
  // venta se borra de un plumazo. "Agregar 5" no depende de lo que haya:
  // el `$inc` lo resuelve el servidor de base de datos, atómicamente.
  // ────────────────────────────────────────────────────────────────────────
  const producto = await aplicarMovimiento({
    productoId: id,
    delta: cantidad,
    motivo,
    usuarioId: req.user.id,
    nota,
  })

  if (!producto) throw ApiError.notFound('Producto no encontrado')

  res.json({
    message: `Se agregaron ${cantidad} unidad(es) a "${producto.nombre}"`,
    data: serializeProduct(producto, { incluirStock: true }),
  })
})

// @desc    Historial de movimientos de stock de un producto
// @route   GET /api/productos/:id/movimientos
// @access  Privado / Admin
exports.listarMovimientos = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')
  const { page, limit } = validated(req, 'query')

  const existe = await Product.exists({ _id: id })
  if (!existe) throw ApiError.notFound('Producto no encontrado')

  const filtro = { producto: id }

  const [movimientos, total] = await Promise.all([
    StockMovement.find(filtro)
      .sort({ createdAt: -1 })
      .skip(skipFor({ page, limit }))
      .limit(limit)
      .populate('usuario', 'nombre email role')
      .lean(),
    StockMovement.countDocuments(filtro),
  ])

  res.json({
    data: movimientos.map(serializeStockMovement),
    meta: buildMeta({ page, limit, total }),
  })
})

// @desc    Eliminar producto
// @route   DELETE /api/productos/:id
// @access  Privado / Admin
exports.remove = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')

  const product = await Product.findByIdAndDelete(id)
  if (!product) throw ApiError.notFound('Producto no encontrado')

  // Los movimientos NO se borran: son el registro contable del producto que
  // existió. Por eso `StockMovement` guarda `nombreProducto` como snapshot.

  res.json({
    message: 'Producto eliminado',
    data: { id: product._id.toString() },
  })
})
