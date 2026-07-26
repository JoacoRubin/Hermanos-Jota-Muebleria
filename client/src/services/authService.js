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

  /**
   * Pide el link de recuperación.
   *
   * Devuelve el mensaje del servidor tal cual, y ese mensaje es EL MISMO
   * exista o no la cuenta. La pantalla no debe intentar distinguir los casos:
   * si mostrara "no encontramos ese email", tiraría abajo desde el frontend la
   * protección contra enumeración que el backend construyó.
   */
  async forgotPassword(email) {
    const { message } = await api.post('/api/auth/forgot-password', { email })
    return message
  },

  /**
   * Canjea el token por una contraseña nueva.
   *
   * El token va en el BODY, no en la query string: una URL con el token queda
   * en el historial del navegador y en los logs de acceso. La pantalla lo lee
   * del link y lo manda por POST.
   */
  async resetPassword({ token, password }) {
    const { message } = await api.post('/api/auth/reset-password', {
      token,
      password,
    })
    return message
  },

  // No hay `isAuthenticated()` acá a propósito. Tener una función con ese
  // nombre en el service y un booleano homónimo en el contexto es la
  // ambigüedad que produjo el bug de `if (!isAuthenticated)` en el carrito.
  // El único lugar que responde esa pregunta es `useAuth().isAuthenticated`.
}

export default AuthService
