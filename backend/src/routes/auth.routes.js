const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controller')
const { authMiddleware } = require('../middleware/auth')

// Rutas públicas
router.post('/register', authController.register)
router.post('/login', authController.login)

// Rutas protegidas (requieren autenticación)
router.get('/profile', authMiddleware, authController.getProfile)
router.get('/verify', authMiddleware, authController.verifyToken)

module.exports = router
