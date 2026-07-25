import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * `apiClient` guarda el access token en una variable de módulo, así que cada
 * test tiene que partir de un módulo fresco. De ahí el `resetModules` + import
 * dinámico en lugar de un import estático arriba.
 */
async function cargarApi() {
  vi.resetModules()
  return import('./apiClient.js')
}

/** Construye una respuesta mínima con la forma que consume `parseResponse`. */
function respuesta(status, cuerpo, { json = true } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (nombre) =>
        nombre.toLowerCase() === 'content-type' && json
          ? 'application/json'
          : 'text/plain',
    },
    json: async () => cuerpo,
    text: async () => String(cuerpo),
  }
}

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('apiClient — reintentos', () => {
  // ── Regresión del bug B9 ────────────────────────────────────────────────
  // El cliente viejo reintentaba TODO, incluidos los POST. Con el cold start
  // de Render, un pedido que llegaba al servidor pero tardaba en responder se
  // reintentaba y quedaba duplicado: el usuario pagaba dos veces.
  it('NO reintenta un POST que falla', async () => {
    const { api } = await cargarApi()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api.post('/api/orders', { items: [] })).rejects.toThrow()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('NO reintenta un PUT ni un DELETE', async () => {
    const { api } = await cargarApi()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api.put('/api/productos/1', {})).rejects.toThrow()
    await expect(api.delete('/api/productos/1')).rejects.toThrow()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sí reintenta un GET, que es idempotente', async () => {
    const { api } = await cargarApi()
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(respuesta(200, { data: [] }))

    const resultado = await api.get('/api/productos', { reintentos: 1 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(resultado.data).toEqual([])
  }, 15000)

  it('no reintenta ante un 4xx: no mejora insistiendo', async () => {
    const { api } = await cargarApi()
    fetchMock.mockResolvedValue(respuesta(404, { message: 'No encontrado' }))

    await expect(api.get('/api/productos/x', { reintentos: 2 })).rejects.toThrow(
      'No encontrado'
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('apiClient — errores', () => {
  it('expone status y detalle de validación', async () => {
    const { api, ApiError } = await cargarApi()
    fetchMock.mockResolvedValue(
      respuesta(400, {
        message: 'Datos inválidos',
        errors: [{ field: 'precio', message: 'No puede ser negativo' }],
      })
    )

    const error = await api.post('/api/productos', {}).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.detalle).toBe('precio: No puede ser negativo')
  })

  it('traduce un fallo de red a un mensaje entendible', async () => {
    const { api } = await cargarApi()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api.post('/api/auth/login', {})).rejects.toThrow(
      /No se pudo conectar/
    )
  })
})

describe('apiClient — sesión', () => {
  it('manda el token en el header sólo cuando se pide auth', async () => {
    const { api, setAccessToken } = await cargarApi()
    setAccessToken('token-123')
    fetchMock.mockResolvedValue(respuesta(200, { data: {} }))

    await api.get('/api/productos')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()

    await api.get('/api/auth/profile', { auth: true })
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer token-123'
    )
  })

  it('ante un 401 renueva la sesión y repite la petición original', async () => {
    const { api, setAccessToken, getAccessToken } = await cargarApi()
    setAccessToken('token-viejo')

    fetchMock
      .mockResolvedValueOnce(respuesta(401, { message: 'Token expirado' }))
      .mockResolvedValueOnce(
        respuesta(200, { data: { accessToken: 'token-nuevo' } })
      )
      .mockResolvedValueOnce(respuesta(200, { data: { user: { id: 'u1' } } }))

    const resultado = await api.get('/api/auth/profile', { auth: true })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toContain('/api/auth/refresh')
    expect(getAccessToken()).toBe('token-nuevo')
    expect(resultado.data.user.id).toBe('u1')
  })

  it('reintenta el refresh una sola vez y avisa si la sesión murió', async () => {
    const { api, setAccessToken, getAccessToken, setSessionExpiredHandler } =
      await cargarApi()

    const alExpirar = vi.fn()
    setSessionExpiredHandler(alExpirar)
    setAccessToken('token-viejo')

    // Falla el request, falla el refresh, y el request no se repite.
    fetchMock
      .mockResolvedValueOnce(respuesta(401, { message: 'Token expirado' }))
      .mockResolvedValueOnce(respuesta(401, { message: 'Sesión inválida' }))

    await expect(
      api.get('/api/auth/profile', { auth: true })
    ).rejects.toThrow()

    expect(alExpirar).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
  })

  it('el refresh es de un solo vuelo aunque fallen varias peticiones a la vez', async () => {
    const { api, setAccessToken } = await cargarApi()
    setAccessToken('token-viejo')

    fetchMock.mockImplementation(async (url) => {
      if (String(url).includes('/api/auth/refresh')) {
        return respuesta(200, { data: { accessToken: 'token-nuevo' } })
      }
      // El primer intento de cada petición falla con 401; tras renovar,
      // el reintento lleva el token nuevo y funciona.
      const authHeader = fetchMock.mock.calls.at(-1)?.[1]?.headers?.Authorization
      return authHeader === 'Bearer token-nuevo'
        ? respuesta(200, { data: { ok: true } })
        : respuesta(401, { message: 'Token expirado' })
    })

    await Promise.all([
      api.get('/api/auth/profile', { auth: true }),
      api.get('/api/orders/mis-pedidos', { auth: true }),
      api.get('/api/productos', { auth: true }),
    ])

    const llamadasRefresh = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/api/auth/refresh')
    )

    expect(llamadasRefresh).toHaveLength(1)
  })

  it('siempre manda las credenciales para que viaje la cookie de refresh', async () => {
    const { api } = await cargarApi()
    fetchMock.mockResolvedValue(respuesta(200, { data: {} }))

    await api.get('/api/productos')

    expect(fetchMock.mock.calls[0][1].credentials).toBe('include')
  })
})
