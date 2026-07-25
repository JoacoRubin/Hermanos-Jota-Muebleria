/**
 * Cliente HTTP único de la aplicación.
 *
 * Concentra tres cosas que antes estaban repetidas (y mal) en cada servicio:
 *
 *  1. El access token vive EN MEMORIA, no en localStorage. Cualquier script
 *     de la página puede leer localStorage; una variable de módulo, no. Si
 *     hay un XSS, ya no se lleva una sesión de 30 días de regalo.
 *
 *  2. El refresh es automático y de un solo vuelo: si diez peticiones fallan
 *     con 401 al mismo tiempo, se renueva UNA vez y las diez esperan a esa.
 *
 *  3. Solo se reintentan peticiones idempotentes. Reintentar un POST que
 *     expiró por timeout es la receta para duplicar pedidos.
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const DEV = import.meta.env.DEV

// Render en plan gratuito duerme el servicio: el primer request puede tardar.
const TIMEOUT_INICIAL_MS = 60_000
const TIMEOUT_REINTENTO_MS = 90_000

let accessToken = null
let refreshPromise = null
let onSessionExpired = () => {}

export function setAccessToken(token) {
  accessToken = token || null
}

export function getAccessToken() {
  return accessToken
}

/** El AuthContext registra acá qué hacer cuando la sesión muere del todo. */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler
}

export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** Mensaje listo para mostrar, incluyendo los detalles de validación. */
  get detalle() {
    if (!this.errors?.length) return this.message
    return this.errors.map((e) => `${e.field}: ${e.message}`).join(' · ')
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return { message: await response.text() }
  }
  try {
    return await response.json()
  } catch {
    return {}
  }
}

async function fetchConTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError(
        `La solicitud tardó más de ${Math.round(timeoutMs / 1000)} segundos. ` +
          'El servidor puede estar iniciando, probá de nuevo en un momento.'
      )
    }
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisá tu conexión a internet.'
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Renueva el access token usando la cookie httpOnly.
 * Single-flight: varias llamadas simultáneas comparten la misma promesa.
 */
function renovarSesion() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await fetchConTimeout(
        `${API_BASE_URL}/api/auth/refresh`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
        TIMEOUT_INICIAL_MS
      )

      if (!response.ok) return null

      const body = await parseResponse(response)
      setAccessToken(body.data?.accessToken)
      return body.data ?? null
    } catch {
      return null
    } finally {
      // Se libera en el microtask siguiente para que todos los que estaban
      // esperando lean el resultado antes de que se limpie.
      setTimeout(() => {
        refreshPromise = null
      }, 0)
    }
  })()

  return refreshPromise
}

const METODOS_IDEMPOTENTES = new Set(['GET', 'HEAD'])

async function request(
  path,
  { method = 'GET', body, auth = false, reintentos = 1, _yaRenovado = false } = {}
) {
  const url = `${API_BASE_URL}${path}`
  const headers = {}

  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  const options = {
    method,
    headers,
    // Necesario para que viaje la cookie del refresh token.
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  // Los reintentos SOLO se aplican a métodos idempotentes. Reintentar un
  // POST que ya llegó al servidor duplica el recurso creado.
  const intentosMaximos = METODOS_IDEMPOTENTES.has(method) ? reintentos : 0

  let ultimoError

  for (let intento = 0; intento <= intentosMaximos; intento++) {
    const timeout = intento === 0 ? TIMEOUT_INICIAL_MS : TIMEOUT_REINTENTO_MS

    try {
      const response = await fetchConTimeout(url, options, timeout)

      // Sesión vencida: se intenta renovar una sola vez y se repite.
      if (response.status === 401 && auth && !_yaRenovado) {
        const renovada = await renovarSesion()

        if (renovada) {
          return request(path, {
            method,
            body,
            auth,
            reintentos,
            _yaRenovado: true,
          })
        }

        setAccessToken(null)
        onSessionExpired()
      }

      const payload = await parseResponse(response)

      if (!response.ok) {
        throw new ApiError(payload.message || `Error ${response.status}`, {
          status: response.status,
          errors: payload.errors,
        })
      }

      return payload
    } catch (error) {
      ultimoError = error

      // Un error del cliente (4xx) no mejora reintentando.
      const esErrorDeCliente =
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500

      if (esErrorDeCliente || intento === intentosMaximos) break

      if (DEV) {
        console.warn(`[api] Reintentando ${method} ${path}…`, error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  throw ultimoError
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) =>
    request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

export { API_BASE_URL }
