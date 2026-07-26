const express = require('express')
const authController = require('../controllers/auth.controller')
const { authMiddleware } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { limiters } = require('../middleware/rateLimit')
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../schemas/auth.schema')

const router = express.Router()

// ── Público ────────────────────────────────────────────────────────────────
// `limiters.auth` es lo que convierte la fuerza bruta en algo inviable:
// 10 intentos fallidos cada 15 minutos por IP.
router.post(
  '/register',
  limiters.auth,
  validate(registerSchema),
  authController.register
)

router.post('/login', limiters.auth, validate(loginSchema), authController.login)

// Se autentican con la cookie httpOnly, no con el header Authorization.
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)

// ── Recuperación de contraseña ─────────────────────────────────────────────
// Públicas por definición: quien las usa no puede iniciar sesión, que es el
// problema que vino a resolver. La única defensa disponible es el rate limit,
// y por eso es más estricto que el del login.
router.post(
  '/forgot-password',
  limiters.passwordReset,
  validate(forgotPasswordSchema),
  authController.forgotPassword
)

router.post(
  '/reset-password',
  limiters.passwordReset,
  validate(resetPasswordSchema),
  authController.resetPassword
)

// ── Requieren access token ────────────────────────────────────────────────
router.get('/profile', authMiddleware, authController.getProfile)
router.get('/verify', authMiddleware, authController.verifyToken)

module.exports = router
