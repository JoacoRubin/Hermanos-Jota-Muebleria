const { z } = require('zod')

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

module.exports = { askSchema }
