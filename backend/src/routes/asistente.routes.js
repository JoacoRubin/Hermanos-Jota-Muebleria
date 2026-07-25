const express = require('express')
const controller = require('../controllers/asistente.controller')
const { validate } = require('../middleware/validate')
const { limiters } = require('../middleware/rateLimit')
const { askSchema } = require('../schemas/asistente.schema')

const router = express.Router()

// ── Público ────────────────────────────────────────────────────────────────
// Cada pregunta gatilla una llamada a un LLM (que cuesta), así que el límite es
// más estricto que el general: `limiters.asistente`.
router.post('/', limiters.asistente, validate(askSchema), controller.preguntar)

module.exports = router
