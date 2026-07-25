const express = require('express')
const controller = require('../controllers/productos.controller')
const { authMiddleware, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { limiters } = require('../middleware/rateLimit')
const { idParams } = require('../schemas/common')
const {
  createProductSchema,
  updateProductSchema,
  listProductsQuery,
} = require('../schemas/product.schema')

const router = express.Router()

// ── Lectura pública ────────────────────────────────────────────────────────
router.get('/', validate(listProductsQuery, 'query'), controller.getAll)
router.get('/:id', validate(idParams, 'params'), controller.getById)

// ── Escritura: solo administradores ────────────────────────────────────────
// Antes estas tres rutas estaban ABIERTAS: cualquiera con `curl` podía crear,
// modificar o borrar productos sin siquiera tener cuenta. El frontend tenía un
// `<ProtectedRoute>`, pero el frontend corre en la máquina del atacante: no
// protege nada. La frontera real es esta.
const soloAdmin = [authMiddleware, requireRole('admin'), limiters.write]

router.post(
  '/',
  ...soloAdmin,
  validate(createProductSchema),
  controller.create
)

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
