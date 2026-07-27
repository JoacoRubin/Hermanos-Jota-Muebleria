import { useState, useEffect, useCallback } from 'react'
import ProductService from '../services/productService'
import ModernLayout from '../components/ModernLayout'
import ProductCard from '../components/products/ProductCard'
import useAgregarAlCarrito from '../hooks/useAgregarAlCarrito'
import { CATEGORIAS } from '../constants'

function Products() {
  // Si no hay sesión, esto no agrega nada: manda a crear la cuenta.
  const handleAgregar = useAgregarAlCarrito()

  const [productos, setProductos] = useState([])
  const [meta, setMeta] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [categoria, setCategoria] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const respuesta = await ProductService.getAll({
        page: pagina,
        limit: 12,
        categoria: categoria || undefined,
      })

      setProductos(respuesta.productos)
      setMeta(respuesta.meta)
    } catch (err) {
      // Se muestra el error real. Antes cualquier fallo caía en un fallback
      // silencioso a datos de ejemplo y el usuario nunca se enteraba de que
      // el backend estaba caído… hasta que fallaba el checkout.
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }, [pagina, categoria])

  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  const handleCambiarCategoria = (evento) => {
    setCategoria(evento.target.value)
    setPagina(1)
  }

  return (
    <ModernLayout title="Catálogo">
      <div className="content-card">
        <div className="catalogo-header">
          <h1>Nuestros muebles artesanales</h1>

          <div className="form-group form-group--inline">
            <label htmlFor="filtro-categoria">Categoría</label>
            <select
              id="filtro-categoria"
              value={categoria}
              onChange={handleCambiarCategoria}
            >
              <option value="">Todas</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="loading" role="status">
            <p>Cargando productos…</p>
            <p className="loading__nota">
              Si es la primera visita del día, el servidor puede tardar unos
              segundos en despertarse.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="estado-vacio">
            <h2>No pudimos cargar el catálogo</h2>
            <p className="error-message" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={cargarProductos}
              className="explore-button"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && productos.length === 0 && (
          <div className="estado-vacio">
            <p>No hay productos que coincidan con ese filtro.</p>
          </div>
        )}

        {!loading && !error && productos.length > 0 && (
          <>
            <div className="products-grid">
              {productos.map((producto) => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  onAgregar={handleAgregar}
                />
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <nav className="paginacion" aria-label="Paginación del catálogo">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPagina((p) => p - 1)}
                  disabled={!meta.hasPrevPage}
                >
                  ← Anterior
                </button>
                <span aria-live="polite">
                  Página {meta.page} de {meta.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPagina((p) => p + 1)}
                  disabled={!meta.hasNextPage}
                >
                  Siguiente →
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </ModernLayout>
  )
}

export default Products
