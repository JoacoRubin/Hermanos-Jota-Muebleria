const ContactMessage = require('../models/ContactMessage')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { serializeContactMessage } = require('../serializers')
const { buildMeta, skipFor } = require('../utils/pagination')
const { validated } = require('../middleware/validate')

// @desc    Enviar una consulta
// @route   POST /api/contacto
// @access  Público
exports.create = asyncHandler(async (req, res) => {
  const consulta = await ContactMessage.create(req.body)

  // La respuesta NO incluye la consulta guardada: un endpoint público no tiene
  // por qué devolver nada más que la confirmación.
  res.status(201).json({
    message:
      'Recibimos tu consulta. Te vamos a responder al email que dejaste.',
    data: { id: consulta._id.toString() },
  })
})

// @desc    Listar consultas
// @route   GET /api/contacto
// @access  Privado / Admin
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, estado } = validated(req, 'query')

  const filtro = {}
  if (estado) filtro.estado = estado

  const [consultas, total] = await Promise.all([
    ContactMessage.find(filtro)
      .sort({ createdAt: -1 })
      .skip(skipFor({ page, limit }))
      .limit(limit)
      .lean(),
    ContactMessage.countDocuments(filtro),
  ])

  res.json({
    data: consultas.map(serializeContactMessage),
    meta: buildMeta({ page, limit, total }),
  })
})

// @desc    Cambiar el estado de una consulta
// @route   PUT /api/contacto/:id/estado
// @access  Privado / Admin
exports.updateStatus = asyncHandler(async (req, res) => {
  const { id } = validated(req, 'params')
  const { estado } = req.body

  const consulta = await ContactMessage.findByIdAndUpdate(
    id,
    { estado },
    { new: true, runValidators: true, context: 'query' }
  )

  if (!consulta) throw ApiError.notFound('Consulta no encontrada')

  res.json({
    message: `Consulta marcada como "${estado}"`,
    data: serializeContactMessage(consulta),
  })
})
