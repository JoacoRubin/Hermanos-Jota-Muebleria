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

/** Un mail que tarda más que esto no va a salir: mejor cortar. */
const TIMEOUT_ENVIO_MS = 15_000

/**
 * Driver de Brevo (ex-Sendinblue).
 *
 * Se eligió por una razón concreta: admite **verificación de remitente único**.
 * O sea, alcanza con confirmar UNA casilla —un Gmail sirve— en vez de tener
 * que cargar registros SPF/DKIM en el DNS de un dominio propio. Eso es lo que
 * lo vuelve viable sin comprar nada. Plan gratis: 300 mails por día.
 *
 * Habla por HTTP con `fetch`, así que NO agrega dependencias al proyecto. Un
 * driver por SMTP habría exigido `nodemailer`.
 *
 * ⚠️ Deliverability: mandando "desde" un Gmail a través de los servidores de
 * Brevo, la firma DKIM no alinea con `gmail.com`. Gmail publica DMARC en
 * `p=none`, así que el mail no se rechaza, pero una parte va a caer en spam.
 * Es el precio de no tener dominio propio, y conviene saberlo antes de que
 * alguien reporte que "no le llegó nada". Ver docs/MAIL.md.
 */
function crearBrevoMailer(env) {
  return {
    nombre: 'brevo',
    async enviar({ para, asunto, texto, html }) {
      const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: env.MAIL_FROM_NOMBRE, email: env.MAIL_FROM },
          to: [{ email: para }],
          subject: asunto,
          textContent: texto,
          ...(html ? { htmlContent: html } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_ENVIO_MS),
      })

      if (!respuesta.ok) {
        // El cuerpo del error de Brevo dice cosas útiles ("sender not
        // verified", "credits exhausted"). Va al log del servidor, nunca al
        // cliente: quien pide recuperar su contraseña recibe siempre la misma
        // respuesta, exista o no la cuenta.
        const detalle = await respuesta.text().catch(() => '')
        throw new Error(`Brevo respondió ${respuesta.status}: ${detalle}`)
      }

      return { enviado: true, driver: 'brevo' }
    },
  }
}

const DRIVERS = {
  console: crearConsoleMailer,
  noop: crearNoopMailer,
  brevo: crearBrevoMailer,
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

  return fabrica(env)
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
