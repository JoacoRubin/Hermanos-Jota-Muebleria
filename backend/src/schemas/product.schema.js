const { z } = require('zod')
const {
  CATEGORIAS,
  MOTIVOS_MOVIMIENTO_STOCK,
  MAX_REPOSICION_POR_MOVIMIENTO,
} = require('../constants')
const { paginationQuery, trimmedString } = require('./common')

// Solo rutas relativas o http(s). Sin esto entra `javascript:` y el
// frontend lo pinta como `src` de una imagen.
const imagenUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) =>
      value === '' || /^https?:\/\//i.test(value) || value.startsWith('/'),
    { message: 'La imagen debe ser una URL http(s) o una ruta relativa' }
  )

const detalles = z
  .record(z.string().max(60), z.string().max(200))
  .refine((obj) => Object.keys(obj).length <= 20, {
    message: 'No se admiten más de 20 detalles',
  })

const productBase = {
  nombre: trimmedString(120).pipe(
    z.string().min(2, 'El nombre debe tener al menos 2 caracteres')
  ),
  descripcion: z.string().trim().max(2000).default(''),
  precio: z
    .number({ invalid_type_error: 'El precio debe ser un número' })
    .nonnegative('El precio no puede ser negativo')
    .max(1_000_000_000, 'El precio es irrealmente alto'),
  stock: z
    .number({ invalid_type_error: 'El stock debe ser un número' })
    .int('El stock debe ser un número entero')
    .nonnegative('El stock no puede ser negativo')
    .max(1_000_000)
    .default(0),
  categoria: z.enum(CATEGORIAS).default('Otros'),
  imagenUrl: imagenUrl.default(''),
  detalles: detalles.default({}),
}

// `.strict()` es la whitelist: lo que no está declarado acá, no llega al modelo.
const createProductSchema = z.object(productBase).strict()

// En el update todo es opcional, pero se exige al menos un campo:
// un PUT vacío es casi siempre un bug del cliente, no una intención.
const updateProductSchema = z
  .object({
    nombre: productBase.nombre.optional(),
    descripcion: z.string().trim().max(2000).optional(),
    precio: productBase.precio.optional(),
    stock: z.number().int().nonnegative().max(1_000_000).optional(),
    categoria: z.enum(CATEGORIAS).optional(),
    imagenUrl: imagenUrl.optional(),
    detalles: detalles.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No se enviaron campos para actualizar',
  })

/**
 * Reposición de stock.
 *
 * `cantidad` es estrictamente positiva y no admite el cero: este endpoint
 * AGREGA unidades. Restar stock a mano no es una operación de negocio válida
 * —las unidades salen por una venta, y eso lo hace el flujo de pedidos—, así
 * que no se ofrece la posibilidad. Para corregir un error de carga está la
 * edición del producto, que queda asentada como `ajuste`.
 *
 * El motivo se limita a los movimientos que un humano puede originar:
 * `venta` y `cancelacion` los escribe el sistema, nunca un formulario.
 */
const agregarStockSchema = z
  .object({
    cantidad: z
      .number({ invalid_type_error: 'La cantidad debe ser un número' })
      .int('La cantidad debe ser un número entero')
      .positive('La cantidad debe ser mayor a cero')
      .max(
        MAX_REPOSICION_POR_MOVIMIENTO,
        `No se pueden agregar más de ${MAX_REPOSICION_POR_MOVIMIENTO} unidades de una vez`
      ),
    motivo: z
      .enum(
        MOTIVOS_MOVIMIENTO_STOCK.filter((m) => m === 'reposicion' || m === 'ajuste'),
        {
          errorMap: () => ({
            message: 'Motivo inválido. Valores permitidos: reposicion, ajuste',
          }),
        }
      )
      .default('reposicion'),
    nota: z.string().trim().max(200).optional().default(''),
  })
  .strict()

const listProductsQuery = paginationQuery.extend({
  categoria: z.enum(CATEGORIAS).optional(),
  buscar: z.string().trim().max(80).optional(),
  soloDisponibles: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
})

module.exports = {
  createProductSchema,
  updateProductSchema,
  agregarStockSchema,
  listProductsQuery,
}
