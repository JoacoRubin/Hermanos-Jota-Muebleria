import { api } from './apiClient.js'

const AsistenteService = {
  /**
   * Le pregunta al asistente (FAQ, envíos, garantía, pagos…).
   * Devuelve { respuesta, fuentes }. Los errores llegan como ApiError, con
   * `.detalle` listo para mostrar.
   */
  async preguntar(pregunta) {
    const { data } = await api.post('/api/asistente', { pregunta })
    return data
  },
}

export default AsistenteService
