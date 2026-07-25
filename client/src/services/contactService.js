import { api } from './apiClient.js'

const ContactService = {
  /** Envía una consulta desde el formulario público. */
  async enviarConsulta({ nombre, email, mensaje }) {
    const { message } = await api.post('/api/contacto', {
      nombre,
      email,
      mensaje,
    })
    return message
  },

  /** Listado para administración. */
  async listar({ page = 1, limit = 20, estado } = {}) {
    const params = new URLSearchParams({ page, limit })
    if (estado) params.set('estado', estado)

    const { data, meta } = await api.get(`/api/contacto?${params}`, {
      auth: true,
    })
    return { consultas: data, meta }
  },

  async cambiarEstado(id, estado) {
    const { data } = await api.put(
      `/api/contacto/${id}/estado`,
      { estado },
      { auth: true }
    )
    return data
  },
}

export default ContactService
