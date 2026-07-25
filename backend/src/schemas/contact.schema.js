const { z } = require('zod')
const { ESTADOS_CONSULTA } = require('../constants')
const { paginationQuery } = require('./common')

// `.strict()` otra vez: el formulario público es la superficie más expuesta
// de toda la API, y acá nadie manda campos que no estén declarados.
const createContactSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(80, 'El nombre no puede superar los 80 caracteres'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Ingresá un email válido')
      .max(254),
    mensaje: z
      .string()
      .trim()
      .min(10, 'Contanos un poco más: al menos 10 caracteres')
      .max(2000, 'El mensaje no puede superar los 2000 caracteres'),
  })
  .strict()

const updateContactStatusSchema = z
  .object({
    estado: z.enum(ESTADOS_CONSULTA, {
      errorMap: () => ({
        message: `Estado inválido. Valores permitidos: ${ESTADOS_CONSULTA.join(', ')}`,
      }),
    }),
  })
  .strict()

const listContactQuery = paginationQuery.extend({
  estado: z.enum(ESTADOS_CONSULTA).optional(),
})

module.exports = {
  createContactSchema,
  updateContactStatusSchema,
  listContactQuery,
}
