const express = require('express')
const controller = require('../controllers/productos.controller')
const {
  authMiddleware,
  optionalAuth,
  requireRole,
} = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { limiters } = require('../middleware/rateLimit')
const { idParams, paginationQuery } = require('../schemas/common')
const {
  createProductSchema,
  updateProductSchema,
  agregarStockSchema,
  listProductsQuery,
} = require('../schemas/product.schema')

const router = express.Router()

// ── Escritura y consultas de inventario: solo administradores ──────────────
// Antes estas rutas estaban ABIERTAS: cualquiera con `curl` podía crear,
// modificar o borrar productos sin siquiera tener cuenta. El frontend tenía un
// `<ProtectedRoute>`, pero el frontend corre en la máquina del atacante: no
// protege nada. La frontera real es esta.
const soloAdmin = [authMiddleware, requireRole('admin'), limiters.write]

// Van ANTES que `GET /:id` a propósito. `/:id/movimientos` tiene tres
// segmentos y no colisiona hoy, pero el orden explícito evita que una ruta
// concreta futura quede tapada por el comodín sin que nadie lo note.
router.post(
  '/:id/stock',
  ...soloAdmin,
  validate(idParams, 'params'),
  validate(agregarStockSchema),
  controller.agregarStock
)

router.get(
  '/:id/movimientos',
  authMiddleware,
  requireRole('admin'),
  validate(idParams, 'params'),
  validate(paginationQuery, 'query'),
  controller.listarMovimientos
)

// ── Lectura pública ────────────────────────────────────────────────────────
// `optionalAuth` no exige sesión: deja pasar al visitante anónimo y, si viene
// un admin con su token, lo identifica para que el serializer le incluya el
// stock exacto. Sin esto el admin necesitaría endpoints paralelos, con su
// propia paginación y su propio filtrado, listos para desincronizarse.
router.get(
  '/',
  optionalAuth,
  validate(listProductsQuery, 'query'),
  controller.getAll
)
router.get(
  '/:id',
  optionalAuth,
  validate(idParams, 'params'),
  controller.getById
)

router.post('/', ...soloAdmin, validate(createProductSchema), controller.create)

router.put(
  '/:id',
  ...soloAdmin,
  validate(idParams, 'params'),
  validate(updateProductSchema),
  controller.update
)

router.delete(
  '/:id',
  ...soloAdmin,
  validate(idParams, 'params'),
  controller.remove
)

module.exports = router
