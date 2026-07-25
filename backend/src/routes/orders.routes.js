const express = require('express')
const ordersController = require('../controllers/orders.controller')
const { authMiddleware, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { limiters } = require('../middleware/rateLimit')
const { idParams } = require('../schemas/common')
const {
  createOrderSchema,
  updateOrderStatusSchema,
  listOrdersQuery,
} = require('../schemas/order.schema')

const router = express.Router()

// Ninguna ruta de pedidos es pública.
router.use(authMiddleware)

// ── Administración ─────────────────────────────────────────────────────────
// Van primero a propósito: `/admin/all` declarado después de `/:id` seguiría
// funcionando (son distinta cantidad de segmentos), pero el orden explícito
// evita que un `/:id` futuro se coma una ruta concreta sin que nadie lo note.
router.get(
  '/admin/all',
  requireRole('admin'),
  validate(listOrdersQuery, 'query'),
  ordersController.getAllOrders
)

router.put(
  '/:id/estado',
  requireRole('admin'),
  validate(idParams, 'params'),
  validate(updateOrderStatusSchema),
  ordersController.updateOrderStatus
)

// ── Usuario autenticado ────────────────────────────────────────────────────
router.post(
  '/',
  limiters.write,
  validate(createOrderSchema),
  ordersController.createOrder
)

router.get(
  '/mis-pedidos',
  validate(listOrdersQuery, 'query'),
  ordersController.getUserOrders
)

router.get('/:id', validate(idParams, 'params'), ordersController.getOrderById)

module.exports = router
