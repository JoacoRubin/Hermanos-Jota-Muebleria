const express = require('express')
const controller = require('../controllers/contact.controller')
const { authMiddleware, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { limiters } = require('../middleware/rateLimit')
const { idParams } = require('../schemas/common')
const {
  createContactSchema,
  updateContactStatusSchema,
  listContactQuery,
} = require('../schemas/contact.schema')

const router = express.Router()

// ── Público ────────────────────────────────────────────────────────────────
// Formulario abierto = imán de spam. `limiters.contact` es bastante más
// estricto que el resto: 5 consultas por hora y por IP.
router.post(
  '/',
  limiters.contact,
  validate(createContactSchema),
  controller.create
)

// ── Admin ──────────────────────────────────────────────────────────────────
const soloAdmin = [authMiddleware, requireRole('admin')]

router.get(
  '/',
  ...soloAdmin,
  validate(listContactQuery, 'query'),
  controller.list
)

router.put(
  '/:id/estado',
  ...soloAdmin,
  validate(idParams, 'params'),
  validate(updateContactStatusSchema),
  controller.updateStatus
)

module.exports = router
