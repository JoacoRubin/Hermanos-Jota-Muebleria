const Product = require('../models/Product')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { serializeProduct } = require('../serializers')
const { buildMeta, skipFor } = require('../utils/pagination')
const { validated } = require('../middleware/validate')
const { env } = require('../config')

// @desc    Listar productos (paginado y filtrable)
// @route   GET /api/productos
// @access  Público
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

  if (env.isProduction) {
    res.set('Cache-Control', 'public, max-age=300')
  }

  res.json({
    data: products.map(serializeProduct),
    meta: buildMeta({ page, limit, total }),
  })
})

// @desc    Obtener un producto
// @route   GET /api/productos/:id
// @access  Público
exports.getById = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')

  const product = await Product.findById(id).lean()
  if (!product) throw ApiError.notFound('Producto no encontrado')

  res.json({ data: serializeProduct(product) })
})

// @desc    Crear producto
// @route   POST /api/productos
// @access  Privado / Admin
exports.create = asyncHandler(async (req, res) => {
  // `req.body` ya pasó por el schema de zod con `.strict()`: contiene
  // exactamente los campos permitidos y nada más. Por eso acá se puede
  // usar directo sin riesgo de mass assignment.
  const product = await Product.create(req.body)

  res.status(201).json({
    message: 'Producto creado exitosamente',
    data: serializeProduct(product),
  })
})

// @desc    Actualizar producto
// @route   PUT /api/productos/:id
// @access  Privado / Admin
exports.update = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')

  const product = await Product.findByIdAndUpdate(id, req.body, {
    new: true,
    // Sin esto los validadores del schema NO corren en un update y entra
    // `precio: -100` sin protestar. Es el default de Mongoose y es una trampa.
    runValidators: true,
    context: 'query',
  })

  if (!product) throw ApiError.notFound('Producto no encontrado')

  res.json({
    message: 'Producto actualizado',
    data: serializeProduct(product),
  })
})

// @desc    Eliminar producto
// @route   DELETE /api/productos/:id
// @access  Privado / Admin
exports.remove = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')

  const product = await Product.findByIdAndDelete(id)
  if (!product) throw ApiError.notFound('Producto no encontrado')

  res.json({
    message: 'Producto eliminado',
    data: { id: product._id.toString() },
  })
})
