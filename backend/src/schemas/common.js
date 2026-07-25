const { z } = require('zod')

/** Un ObjectId de Mongo válido, como string de 24 hex. */
const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido')

const idParams = z.object({ id: objectId })

/**
 * Paginación estándar para todos los listados.
 * El `limit` tiene techo: sin él, `?limit=999999` es un DoS gratis.
 */
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** Colapsa espacios y recorta: evita nombres tipo "Silla      Premium". */
const trimmedString = (max) =>
  z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, ' '))
    .pipe(z.string().max(max))

module.exports = { objectId, idParams, paginationQuery, trimmedString }
