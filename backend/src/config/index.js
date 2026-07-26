const { loadEnv } = require('./env')
const { createTokenService } = require('../utils/tokens')
const { crearMailer } = require('../services/mailer')

/**
 * Punto único de configuración. Se evalúa una sola vez, al primer require.
 *
 * Si falta o es inválida una variable crítica, esto lanza y el proceso muere
 * en el arranque. Es exactamente lo que queremos: nunca más un servidor
 * corriendo con un secreto por defecto.
 */
const env = loadEnv()
const tokens = createTokenService(env)
const mailer = crearMailer(env)

module.exports = { env, tokens, mailer }
