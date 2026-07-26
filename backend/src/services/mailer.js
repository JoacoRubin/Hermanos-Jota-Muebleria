/**
 * Envío de mails, detrás de una interfaz.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ESTADO ACTUAL: NO HAY PROVEEDOR DE MAIL CONFIGURADO EN ESTE PROYECTO.
 * ────────────────────────────────────────────────────────────────────────────
 * En desarrollo el link de recuperación se imprime por consola y funciona
 * perfectamente para probar el flujo completo. En producción, hoy, el mail
 * NO LLEGA A NINGÚN LADO. Ver `docs/MAIL.md` para conectar un proveedor.
 *
 * La interfaz es un contrato de una sola función:
 *
 *     enviar({ para, asunto, texto, html }) => Promise<{ enviado, driver }>
 *
 * Agregar SendGrid/Resend/SMTP es escribir un driver más y cambiar la variable
 * `MAIL_DRIVER`. Nada del controller de auth cambia. Ese es el punto entero de
 * poner una interfaz en lugar de llamar a un SDK desde el controller: el día
 * que se elija proveedor, el flujo de seguridad ya está escrito y probado.
 */

/**
 * Driver de desarrollo: escribe el mail en la consola del servidor.
 *
 * No es un stub vacío que devuelve `true` y se olvida. Imprime el link entero
 * y bien visible, porque es la única forma de probar el flujo sin proveedor.
 * Un stub silencioso haría que "recuperar contraseña" pareciera funcionar y no
 * funcionara, que es exactamente el bug que este proyecto ya tuvo una vez en
 * el formulario de contacto.
 */
function crearConsoleMailer() {
  return {
    nombre: 'console',
    async enviar({ para, asunto, texto }) {
      const linea = '─'.repeat(72)
      console.log(
        `\n${linea}\n` +
          `📧 MAIL (driver: console — no se envió nada de verdad)\n` +
          `${linea}\n` +
          `Para:    ${para}\n` +
          `Asunto:  ${asunto}\n` +
          `${linea}\n` +
          `${texto}\n` +
          `${linea}\n`
      )
      return { enviado: true, driver: 'console' }
    },
  }
}

/**
 * Driver nulo: descarta el mail y avisa por consola que se descartó.
 *
 * Es el que queda en producción mientras no haya proveedor. Grita en los logs
 * a propósito: un silencio ahí sería un flujo de recuperación roto que nadie
 * detecta hasta que un usuario reclama.
 */
function crearNoopMailer() {
  return {
    nombre: 'noop',
    async enviar({ para, asunto }) {
      console.warn(
        `[mailer] MAIL_DRIVER=noop: se descartó "${asunto}" para ${para}. ` +
          'No hay proveedor de mail configurado (ver docs/MAIL.md).'
      )
      return { enviado: false, driver: 'noop' }
    },
  }
}

const DRIVERS = {
  console: crearConsoleMailer,
  noop: crearNoopMailer,
}

function crearMailer(env) {
  // `env.mailDriver` ya resolvió el default según el entorno: `console` en
  // desarrollo, `noop` en producción. Ver `config/env.js`.
  const nombre = env.mailDriver
  const fabrica = DRIVERS[nombre]

  if (!fabrica) {
    throw new Error(
      `MAIL_DRIVER desconocido: "${nombre}". Disponibles: ${Object.keys(DRIVERS).join(', ')}`
    )
  }

  return fabrica()
}

// ─── Plantillas ─────────────────────────────────────────────────────────────

/**
 * El mail de recuperación.
 *
 * Se arma acá y no en el controller para que el controller se ocupe solo del
 * flujo de seguridad (generar, hashear, guardar, responder igual siempre) y no
 * de redactar. Son dos cosas que cambian por razones distintas.
 */
function mailRecuperacion({ nombre, link, minutos }) {
  return {
    asunto: 'Restablecé tu contraseña — Hermanos Jota',
    texto:
      `Hola ${nombre},\n\n` +
      'Recibimos un pedido para restablecer la contraseña de tu cuenta.\n\n' +
      `Entrá acá para elegir una nueva:\n${link}\n\n` +
      `El link vence en ${minutos} minutos y se puede usar UNA sola vez.\n\n` +
      'Si no pediste esto, ignorá el mensaje: tu contraseña sigue siendo la ' +
      'misma y nadie accedió a tu cuenta.\n\n' +
      '— Mueblería Hermanos Jota',
  }
}

module.exports = { crearMailer, mailRecuperacion }
