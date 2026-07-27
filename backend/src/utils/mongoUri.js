/**
 * Preguntas sobre la cadena de conexión, para las guardas destructivas.
 *
 * Existe porque `NODE_ENV` es una mala guarda: describe cómo arrancaste el
 * proceso, no a qué base le estás por escribir. Un script corrido a mano con
 * `MONGO_URI` apuntando a Atlas y `NODE_ENV=development` pasa cualquier
 * `if (isProduction)` y borra datos reales.
 *
 * Lo único que no se puede falsear por olvido es la URI: si dice `mongodb+srv`
 * contra un host de internet, no estás en tu máquina.
 */

/** Host (o lista de hosts) de la URI, sin credenciales. `''` si no se puede leer. */
function hostDe(uri) {
  if (typeof uri !== 'string') return ''

  // No se usa `new URL()`: `mongodb://` no es un esquema que WHATWG parsee de
  // forma útil, y las URIs con varios hosts separados por coma lo rompen.
  const sinEsquema = uri.replace(/^mongodb(\+srv)?:\/\//i, '')
  const sinCredenciales = sinEsquema.includes('@')
    ? sinEsquema.slice(sinEsquema.lastIndexOf('@') + 1)
    : sinEsquema

  return sinCredenciales.split(/[/?]/)[0] || ''
}

const HOSTS_LOCALES = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)$/i

/**
 * Saca el puerto de una entrada `host:puerto`.
 *
 * El `split(':')` pelado no alcanza: una dirección IPv6 va entre corchetes y
 * está LLENA de dos puntos, así que `[::1]:27017` se partía en `[` y la guarda
 * trataba un `localhost` legítimo como remoto.
 */
function sinPuerto(entrada) {
  const host = entrada.trim()

  if (host.startsWith('[')) {
    const cierre = host.indexOf(']')
    return cierre === -1 ? host : host.slice(0, cierre + 1)
  }

  return host.split(':')[0]
}

/**
 * ¿Apunta a una base en esta máquina?
 *
 * Ante la duda, devuelve `false`. Es el default seguro: como se usa para
 * habilitar borrados, equivocarse hacia "es remota" cuesta un flag de más;
 * equivocarse hacia "es local" cuesta el catálogo.
 */
function esBaseLocal(uri) {
  const host = hostDe(uri)
  if (!host) return false

  // Una URI puede traer varios hosts: `a:27017,b:27017`. Alcanza con que uno
  // no sea local para tratarla como remota.
  return host
    .split(',')
    .every((entrada) => HOSTS_LOCALES.test(sinPuerto(entrada)))
}

module.exports = { hostDe, esBaseLocal }
