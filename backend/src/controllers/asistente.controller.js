const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { env } = require('../config')

// El RAG puede estar arrancando en frío (carga el modelo): damos margen, pero
// no infinito, para no dejar la request colgada.
const RAG_TIMEOUT_MS = 45_000

// @desc    Preguntar al asistente (FAQ, envíos, garantía, pagos…)
// @route   POST /api/asistente
// @access  Público
//
// Este endpoint NO responde por sí mismo: hace de gateway (BFF) hacia el
// microservicio RAG en Python. Así la URL del RAG queda del lado del servidor,
// el asistente hereda el CORS y el rate limiting de esta API, y el frontend
// habla con un solo origen. Precios y stock NO salen de acá: viven en /productos.
exports.preguntar = asyncHandler(async (req, res) => {
  const { pregunta } = req.body

  if (!env.ragApiUrl) {
    throw new ApiError(503, 'El asistente no está disponible en este momento.')
  }

  let datos
  try {
    const upstream = await fetch(`${env.ragApiUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // El RAG espera { question }; nosotros usamos "pregunta" de puertas afuera.
      body: JSON.stringify({ question: pregunta }),
      signal: AbortSignal.timeout(RAG_TIMEOUT_MS),
    })

    if (!upstream.ok) {
      throw new Error(`el RAG respondió ${upstream.status}`)
    }
    datos = await upstream.json()
  } catch (error) {
    // El detalle del upstream se loguea para nosotros, no se filtra al cliente.
    console.error('[asistente] fallo al consultar el RAG:', error.message)
    throw new ApiError(
      502,
      'El asistente no pudo responder en este momento. Probá de nuevo en un ratito.'
    )
  }

  res.json({
    data: {
      respuesta: datos.answer,
      // Solo exponemos de qué documento y sección salió: el resto (texto crudo,
      // distancias) es ruido interno del RAG que el cliente no necesita.
      fuentes: (datos.sources || []).map((s) => ({
        fuente: s.fuente,
        seccion: s.seccion || '',
      })),
      // Preguntas de seguimiento que el RAG genera en la MISMA llamada a Gemini
      // (no cuestan una consulta extra). El cliente las muestra como chips.
      sugerencias: datos.suggestions || [],
      // Productos del catálogo que el RAG mencionó en la respuesta (recomendación).
      // Viene con precio/stock ya resueltos por el RAG contra el catálogo en vivo.
      productos: (datos.productos || []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        stock: p.stock ?? 0,
        imagenUrl: p.imagenUrl,
      })),
    },
  })
})
