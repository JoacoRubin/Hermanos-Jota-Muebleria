const Product = require('../models/Product')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { serializeProduct } = require('../serializers')
const { ragResponseSchema } = require('../schemas/asistente.schema')
const { env } = require('../config')

// El RAG puede estar arrancando en frío (carga el modelo): damos margen, pero
// no infinito, para no dejar la request colgada.
const RAG_TIMEOUT_MS = 45_000

/**
 * Vuelve a leer de MongoDB los productos que el RAG mencionó.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * POR QUÉ NO SE CONFÍA EN LO QUE MANDA EL MODELO
 * ════════════════════════════════════════════════════════════════════════════
 * Antes, `precio` e `imagenUrl` salían tal cual de la respuesta del RAG. El
 * RAG tiene su PROPIO snapshot del catálogo dentro de los embeddings, y ese
 * snapshot envejece: si el precio cambió en la base y el índice quedó viejo,
 * el bot le cotizaba al cliente un precio que no existe.
 *
 * Es exactamente la misma clase de bug que este repo ya arregló en pedidos
 * —donde el precio sale de la base y NUNCA del request— aplicada al lugar
 * equivocado. Un LLM es una fuente no confiable igual que el navegador del
 * cliente. Que hable bien no lo hace autoridad comercial.
 *
 * Y hay un beneficio de seguridad que no es obvio: aunque a alguien le
 * funcione un prompt injection y el modelo diga "el sofá cuesta $1", el precio
 * que se renderiza sale de MongoDB. Esto CORTA la cadena de confianza que
 * arrancaría en texto que no controlamos y terminaría en lo que el cliente
 * cree que va a pagar.
 *
 * Del RAG se conserva UNA sola cosa: el orden, que es su ranking de
 * relevancia. Eso sí es lo suyo.
 */
async function rehidratarProductos(recomendados) {
  if (recomendados.length === 0) return []

  const ids = recomendados.map((p) => p.id)
  const encontrados = await Product.find({ _id: { $in: ids } }).lean()

  const porId = new Map(encontrados.map((p) => [p._id.toString(), p]))

  return (
    ids
      .map((id) => porId.get(id))
      // Un id alucinado, o un producto dado de baja después de que se armó el
      // índice, simplemente no aparece. Antes generaba una tarjeta que
      // linkeaba a un 404.
      .filter(Boolean)
      // `incluirStock` queda en false: el asistente es público. La tarjeta
      // recibe `stockStatus` y `lowStockMessage` igual que el catálogo, porque
      // sale del MISMO serializer. Un solo contrato, un solo lugar donde
      // cambiarlo.
      .map((producto) => serializeProduct(producto))
  )
}

// @desc    Preguntar al asistente (FAQ, envíos, garantía, pagos…)
// @route   POST /api/asistente
// @access  Público
//
// Este endpoint NO responde por sí mismo: hace de gateway (BFF) hacia el
// microservicio RAG en Python. Así la URL del RAG queda del lado del servidor,
// el asistente hereda el CORS y el rate limiting de esta API, y el frontend
// habla con un solo origen.
//
// El RAG aporta el TEXTO y a QUÉ productos se refiere. Los datos comerciales
// —precio, disponibilidad, nombre— los pone Express leyendo Mongo.
exports.preguntar = asyncHandler(async (req, res) => {
  const { pregunta } = req.body

  if (!env.ragApiUrl) {
    throw new ApiError(503, 'El asistente no está disponible en este momento.')
  }

  let crudo
  try {
    const upstream = await fetch(`${env.ragApiUrl}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Si el microservicio está publicado sin autenticar, TODO el rate
        // limiting de esta API es decorativo: cualquiera que descubra la URL
        // le pega directo y quema la cuota del modelo. Esta cabecera es la
        // mitad que le toca a Express; la otra mitad —validarla— es del RAG.
        // Sin `RAG_API_KEY` configurada no se manda nada y todo sigue igual.
        ...(env.RAG_API_KEY
          ? { Authorization: `Bearer ${env.RAG_API_KEY}` }
          : {}),
      },
      // El RAG espera { question }; nosotros usamos "pregunta" de puertas afuera.
      body: JSON.stringify({ question: pregunta }),
      signal: AbortSignal.timeout(RAG_TIMEOUT_MS),
    })

    if (!upstream.ok) {
      throw new Error(`el RAG respondió ${upstream.status}`)
    }
    crudo = await upstream.json()
  } catch (error) {
    // El detalle del upstream se loguea para nosotros, no se filtra al cliente.
    console.error('[asistente] fallo al consultar el RAG:', error.message)
    throw new ApiError(
      502,
      'El asistente no pudo responder en este momento. Probá de nuevo en un ratito.'
    )
  }

  // La respuesta del modelo pasa por zod igual que cualquier input. Las listas
  // son tolerantes (descartan el elemento roto, no la lista); solo `answer` es
  // obligatoria, porque sin texto no hay nada que mostrar.
  const parsed = ragResponseSchema.safeParse(crudo)

  if (!parsed.success) {
    console.error(
      '[asistente] el RAG devolvió una respuesta inválida:',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · ')
    )
    throw new ApiError(
      502,
      'El asistente no pudo responder en este momento. Probá de nuevo en un ratito.'
    )
  }

  const { answer, sources, suggestions, productos } = parsed.data

  // Si la base falla, se devuelve igual la respuesta de texto sin tarjetas.
  // El asistente es una función accesoria: no puede tumbar su propia respuesta
  // porque no pudo adornarla.
  let productosRehidratados = []
  try {
    productosRehidratados = await rehidratarProductos(productos)
  } catch (error) {
    console.error(
      '[asistente] no se pudieron rehidratar los productos:',
      error.message
    )
  }

  res.json({
    data: {
      respuesta: answer,
      // De qué documento y sección salió. El resto (texto crudo, distancias)
      // es ruido interno del RAG que el cliente no necesita.
      fuentes: sources,
      // Preguntas de seguimiento que el RAG genera en la MISMA llamada a Gemini
      // (no cuestan una consulta extra). El cliente las muestra como chips.
      sugerencias: suggestions,
      // Datos frescos de Mongo, en el orden de relevancia que dio el RAG.
      productos: productosRehidratados,
    },
  })
})
