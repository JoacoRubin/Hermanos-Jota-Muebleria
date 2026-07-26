import { api } from './apiClient.js'

/**
 * Pedidos.
 *
 * Ojo con `createOrder`: solo manda `producto` y `cantidad`. El precio lo
 * pone el servidor leyéndolo de la base. Si el cliente pudiera mandarlo,
 * podría comprar un aparador de $210.000 por $1.
 */
const OrderService = {
  async createOrder({ items, direccionEnvio, notas }) {
    const { data } = await api.post(
      '/api/orders',
      {
        items: items.map((item) => ({
          producto: item.id,
          cantidad: item.cantidad,
        })),
        direccionEnvio,
        ...(notas ? { notas } : {}),
      },
      { auth: true }
    )

    return data
  },

  /**
   * @param {{ grupo?: 'pendientes'|'entregados'|'cancelados' }} filtros
   *
   * El `grupo` se resuelve en el SERVIDOR. Traer todo y filtrar acá rompería
   * la paginación: la página 1 de "cancelados" saldría de los 20 pedidos más
   * recientes de cualquier estado, y si ninguno está cancelado la pestaña se
   * vería vacía teniendo pedidos cancelados más viejos.
   */
  async getUserOrders({ page = 1, limit = 20, grupo, estado } = {}) {
    const params = new URLSearchParams({ page, limit })
    if (grupo) params.set('grupo', grupo)
    if (estado) params.set('estado', estado)

    const { data, meta } = await api.get(
      `/api/orders/mis-pedidos?${params}`,
      { auth: true, reintentos: 2 }
    )
    return { pedidos: data, meta }
  },

  async getOrderById(orderId) {
    const { data } = await api.get(`/api/orders/${orderId}`, { auth: true })
    return data
  },

  async getAllOrders({ page = 1, limit = 20, estado, grupo } = {}) {
    const params = new URLSearchParams({ page, limit })
    if (estado) params.set('estado', estado)
    if (grupo) params.set('grupo', grupo)

    const { data, meta } = await api.get(`/api/orders/admin/all?${params}`, {
      auth: true,
    })
    return { pedidos: data, meta }
  },

  /**
   * Cambia el estado (solo admin).
   *
   * `seguimiento` es opcional y se usa al despachar. El servidor rechaza con
   * 409 cualquier transición que no sea válida desde el estado actual: la UI
   * solo ofrece las que corresponden, pero eso es comodidad, no seguridad.
   */
  async updateOrderStatus(orderId, { estado, nota, seguimiento } = {}) {
    const { data } = await api.put(
      `/api/orders/${orderId}/estado`,
      {
        estado,
        ...(nota ? { nota } : {}),
        ...(seguimiento ? { seguimiento } : {}),
      },
      { auth: true }
    )
    return data
  },

  /**
   * Cancela un pedido y devuelve las unidades al stock.
   *
   * Misma ruta para el cliente y para el admin: quién puede cancelar qué lo
   * decide el servidor según el rol y el estado del pedido.
   */
  async cancelOrder(orderId, motivo = '') {
    const { data } = await api.post(
      `/api/orders/${orderId}/cancelar`,
      { motivo },
      { auth: true }
    )
    return data
  },
}

export default OrderService
