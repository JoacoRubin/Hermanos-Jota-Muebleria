const express = require('express')
const ordersController = require('../controllers/orders.controller')
const {
  authMiddleware,
  requireRole,
  bloquearAdmins,
} = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { limiters } = require('../middleware/rateLimit')
const { idParams } = require('../schemas/common')
const {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
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
/**
 * `bloquearAdmins` va ANTES de `validate` y del controller a propósito: el
 * controller arranca reservando stock, así que un rechazo tardío obligaría a
 * liberar lo ya descontado. La request del admin no llega a tocar inventario.
 *
 * Que el frontend además le esconda el carrito NO reemplaza esto: aquello es
 * UX, esto es la regla. Un `curl` con el token del admin entra por acá.
 */
router.post(
  '/',
  limiters.write,
  bloquearAdmins,
  validate(createOrderSchema),
  ordersController.createOrder
)

/**
 * Cancelar NO lleva `requireRole`: es la ruta del cliente para su propio
 * pedido, y el admin la usa también. Quién puede cancelar qué —el dueño en
 * estados cancelables, el admin en más estados— lo decide el controller, que
 * es el único que conoce el pedido. Un `requireRole` acá dejaría afuera al
 * cliente; no ponerlo NO significa que no haya control de permisos.
 *
 * Lleva `limiters.write` porque devuelve stock: es una escritura con
 * consecuencias sobre el inventario, no una lectura.
 */
router.post(
  '/:id/cancelar',
  limiters.write,
  validate(idParams, 'params'),
  validate(cancelOrderSchema),
  ordersController.cancelOrder
)

router.get(
  '/mis-pedidos',
  validate(listOrdersQuery, 'query'),
  ordersController.getUserOrders
)

router.get('/:id', validate(idParams, 'params'), ordersController.getOrderById)

module.exports = router
