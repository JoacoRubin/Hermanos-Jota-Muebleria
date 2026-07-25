const { z } = require('zod')
const {
  ESTADOS_PEDIDO,
  MAX_CANTIDAD_POR_ITEM,
  MAX_ITEMS_POR_PEDIDO,
} = require('../constants')
const { objectId, paginationQuery } = require('./common')

/**
 * Lo único que el cliente puede decir sobre un ítem es QUÉ y CUÁNTO.
 *
 * `precio` y `nombre` NO están acá, y no es un olvido: son datos que el
 * servidor tiene que leer de la base. Si el cliente pudiera mandar el precio,
 * podría comprar un aparador de $210.000 por $1.
 */
const orderItemSchema = z
  .object({
    producto: objectId,
    cantidad: z
      .number({ invalid_type_error: 'La cantidad debe ser un número' })
      .int('La cantidad debe ser un número entero')
      .min(1, 'La cantidad mínima es 1')
      .max(MAX_CANTIDAD_POR_ITEM, `La cantidad máxima por ítem es ${MAX_CANTIDAD_POR_ITEM}`),
  })
  .strict()

const createOrderSchema = z
  .object({
    items: z
      .array(orderItemSchema)
      .min(1, 'El pedido debe contener al menos un producto')
      .max(MAX_ITEMS_POR_PEDIDO, `No se admiten más de ${MAX_ITEMS_POR_PEDIDO} ítems por pedido`),
    direccionEnvio: z
      .string()
      .trim()
      .min(10, 'La dirección de envío debe tener al menos 10 caracteres')
      .max(300, 'La dirección no puede superar los 300 caracteres'),
    notas: z.string().trim().max(500).optional().default(''),
  })
  .strict()

const updateOrderStatusSchema = z
  .object({
    estado: z.enum(ESTADOS_PEDIDO, {
      errorMap: () => ({
        message: `Estado inválido. Valores permitidos: ${ESTADOS_PEDIDO.join(', ')}`,
      }),
    }),
  })
  .strict()

const listOrdersQuery = paginationQuery.extend({
  estado: z.enum(ESTADOS_PEDIDO).optional(),
})

module.exports = { createOrderSchema, updateOrderStatusSchema, listOrdersQuery }
