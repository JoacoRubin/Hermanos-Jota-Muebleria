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
  /**
   * @param {{ auth?: boolean }} opciones
   *
   * `auth: true` manda el access token y, SI el usuario es admin, la respuesta
   * incluye además el campo `stock` con la cantidad exacta. Para cualquier otro
   * usuario —y para el anónimo— ese campo directamente no viene: el servidor
   * devuelve `stockStatus` y `lowStockMessage` ya calculados.
   *
   * Por eso el catálogo público llama sin `auth` y el panel de admin con
   * `auth: true`. El endpoint es el mismo; lo que cambia es quién pregunta.
   */
  async getAll({ page = 1, limit = 20, categoria, buscar, auth = false } = {}) {
    const params = new URLSearchParams({ page, limit })
    if (categoria) params.set('categoria', categoria)
    if (buscar) params.set('buscar', buscar)

    // Los GET sí se reintentan: son idempotentes y el cold start de Render
    // los hace fallar seguido.
    const { data, meta } = await api.get(`/api/productos?${params}`, {
      reintentos: 2,
      auth,
    })

    return { productos: data, meta }
  },

  async getById(id, { auth = false } = {}) {
    const { data } = await api.get(`/api/productos/${id}`, {
      reintentos: 2,
      auth,
    })
    return data
  },

  /**
   * Agrega unidades al stock (solo admin).
   *
   * SUMA, no reemplaza: el servidor hace `$inc`. Por eso el formulario pide
   * "cuántas agregar" y no "cuántas hay en total" — si pidiera el total, el
   * admin tendría que hacer la cuenta y una venta simultánea se perdería.
   */
  async agregarStock(id, { cantidad, motivo = 'reposicion', nota = '' }) {
    const { data } = await api.post(
      `/api/productos/${id}/stock`,
      { cantidad, motivo, ...(nota ? { nota } : {}) },
      { auth: true }
    )
    return data
  },

  /** Historial de movimientos de stock de un producto (solo admin). */
  async getMovimientos(id, { page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ page, limit })
    const { data, meta } = await api.get(
      `/api/productos/${id}/movimientos?${params}`,
      { auth: true }
    )
    return { movimientos: data, meta }
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
