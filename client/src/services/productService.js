import { api } from './apiClient.js'

/**
 * Catálogo de productos.
 *
 * Se eliminó el fallback silencioso a datos mock. Antes, CUALQUIER error
 * —incluido un 500 o la base caída— devolvía productos de ejemplo: el usuario
 * veía un catálogo normal, agregaba al carrito y recién fallaba al confirmar
 * el pedido, con IDs que no existían. Un error visible es infinitamente mejor
 * que un catálogo mentiroso.
 */
const ProductService = {
  /**
   * @returns {Promise<{ productos: Array, meta: object }>}
   */
  async getAll({ page = 1, limit = 20, categoria, buscar } = {}) {
    const params = new URLSearchParams({ page, limit })
    if (categoria) params.set('categoria', categoria)
    if (buscar) params.set('buscar', buscar)

    // Los GET sí se reintentan: son idempotentes y el cold start de Render
    // los hace fallar seguido.
    const { data, meta } = await api.get(`/api/productos?${params}`, {
      reintentos: 2,
    })

    return { productos: data, meta }
  },

  async getById(id) {
    const { data } = await api.get(`/api/productos/${id}`, { reintentos: 2 })
    return data
  },

  async create(productData) {
    const { data } = await api.post('/api/productos', productData, {
      auth: true,
    })
    return data
  },

  async update(id, productData) {
    const { data } = await api.put(`/api/productos/${id}`, productData, {
      auth: true,
    })
    return data
  },

  async remove(id) {
    return api.delete(`/api/productos/${id}`, { auth: true })
  },
}

export default ProductService
