const express = require('express')
const router = express.Router()
const ordersController = require('../controllers/orders.controller')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// Todas las rutas requieren autenticación
router.use(authMiddleware)

// Rutas para usuarios autenticados
router.post('/', ordersController.createOrder)
router.get('/mis-pedidos', ordersController.getUserOrders)
router.get('/:id', ordersController.getOrderById)

// Rutas solo para administradores
router.get('/admin/all', adminMiddleware, ordersController.getAllOrders)
router.put('/:id/estado', adminMiddleware, ordersController.updateOrderStatus)

module.exports = router
