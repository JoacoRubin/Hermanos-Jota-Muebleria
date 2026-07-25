import { api, setAccessToken } from './apiClient.js'

/**
 * Autenticación contra la API.
 *
 * Ya no toca localStorage: el access token vive en memoria (dentro de
 * `apiClient`) y el refresh token en una cookie httpOnly que el JavaScript
 * de la página no puede leer.
 */
const AuthService = {
  async register(userData) {
    const { data } = await api.post('/api/auth/register', userData)
    setAccessToken(data.accessToken)
    return data.user
  },

  async login(credentials) {
    const { data } = await api.post('/api/auth/login', credentials)
    setAccessToken(data.accessToken)
    return data.user
  },

  async logout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      // Aunque el servidor no conteste, la sesión local se corta igual.
      setAccessToken(null)
    }
  },

  /**
   * Recupera la sesión al cargar la app.
   *
   * El access token se perdió al refrescar la página (vive en memoria, es lo
   * esperado), así que se pide uno nuevo con la cookie de refresh. Si no hay
   * cookie válida, simplemente no hay sesión.
   */
  async restoreSession() {
    try {
      const { data } = await api.post('/api/auth/refresh')
      setAccessToken(data.accessToken)
      return data.user
    } catch {
      setAccessToken(null)
      return null
    }
  },

  async getProfile() {
    const { data } = await api.get('/api/auth/profile', { auth: true })
    return data.user
  },

  // No hay `isAuthenticated()` acá a propósito. Tener una función con ese
  // nombre en el service y un booleano homónimo en el contexto es la
  // ambigüedad que produjo el bug de `if (!isAuthenticated)` en el carrito.
  // El único lugar que responde esa pregunta es `useAuth().isAuthenticated`.
}

export default AuthService
