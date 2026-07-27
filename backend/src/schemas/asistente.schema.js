const { z } = require('zod')
const { objectId } = require('./common')

// `.strict()`: el asistente es público, así que —igual que el formulario de
// contacto— solo se acepta el campo declarado y nada más.
const askSchema = z
  .object({
    pregunta: z
      .string()
      .trim()
      .min(3, 'La pregunta es demasiado corta')
      .max(500, 'La pregunta no puede superar los 500 caracteres'),
  })
  .strict()

// ─── Validación de la SALIDA del RAG ────────────────────────────────────────
//
// Esta API valida con zod cada request que entra. Hasta acá, la respuesta del
// RAG se consumía a ojos cerrados: `datos.answer` podía ser `undefined`,
// `datos.suggestions` podía traer 200 strings de 5.000 caracteres, y todo eso
// terminaba renderizado en un panel de 370px.
//
// Un modelo de lenguaje es una fuente NO CONFIABLE, exactamente igual que el
// navegador del cliente. Que hable bien no lo convierte en autoridad de nada.
// Si validamos lo que manda el usuario, hay que validar lo que manda el modelo.

const MAX_SOURCES = 10
const MAX_SUGERENCIAS = 5
const MAX_PRODUCTOS = 6

/**
 * Array tolerante: un elemento malformado se descarta SOLO a él, no al array
 * entero, y después se recorta al tope.
 *
 * El `.catch(null)` por elemento es lo que evita el comportamiento "todo o
 * nada": que el RAG mande una fuente rara no debería borrar las otras nueve
 * que estaban bien.
 */
const listaTolerante = (item, tope) =>
  z
    .array(item.catch(null))
    .catch([])
    .transform((valores) => valores.filter(Boolean).slice(0, tope))

const fuenteSchema = z.object({
  fuente: z.string().trim().min(1).max(200),
  seccion: z.string().trim().max(200).optional().default(''),
})

/**
 * Del producto solo se valida el ID, y a propósito.
 *
 * Nombre, precio e imagen que mande el RAG se IGNORAN: se vuelven a leer de
 * MongoDB. Ver `asistente.controller.js`. Acá lo único que se necesita es un
 * identificador con forma de ObjectId; un id alucinado no matchea el regex y
 * se descarta antes de llegar a la base.
 */
const productoRecomendadoSchema = z.object({ id: objectId })

const ragResponseSchema = z.object({
  // Lo único obligatorio. Sin respuesta no hay nada que mostrar, y eso sí es
  // un fallo del upstream: se traduce en 502.
  answer: z
    .string()
    .trim()
    .min(1, 'El RAG devolvió una respuesta vacía')
    .max(5000, 'El RAG devolvió una respuesta desmedida'),

  sources: listaTolerante(fuenteSchema, MAX_SOURCES),
  suggestions: listaTolerante(
    z.string().trim().min(1).max(200),
    MAX_SUGERENCIAS
  ),
  productos: listaTolerante(productoRecomendadoSchema, MAX_PRODUCTOS),
})

module.exports = {
  askSchema,
  ragResponseSchema,
  MAX_SOURCES,
  MAX_SUGERENCIAS,
  MAX_PRODUCTOS,
}
