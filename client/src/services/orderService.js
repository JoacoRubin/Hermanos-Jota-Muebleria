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

  async getUserOrders({ page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ page, limit })
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

  async getAllOrders({ page = 1, limit = 20, estado } = {}) {
    const params = new URLSearchParams({ page, limit })
    if (estado) params.set('estado', estado)

    const { data, meta } = await api.get(`/api/orders/admin/all?${params}`, {
      auth: true,
    })
    return { pedidos: data, meta }
  },

  async updateOrderStatus(orderId, estado) {
    const { data } = await api.put(
      `/api/orders/${orderId}/estado`,
      { estado },
      { auth: true }
    )
    return data
  },
}

export default OrderService
