import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ProductService from '../services/productService'
import ModernLayout from '../components/ModernLayout'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'
import { formatearPrecio } from '../constants'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isAdmin } = useAuth()
  const { toast, confirm } = useUI()

  const [producto, setProducto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargarProducto = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setProducto(await ProductService.getById(id))
    } catch (err) {
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    cargarProducto()
  }, [cargarProducto])

  const handleAgregar = () => {
    addToCart(producto)
    toast.success(`${producto.nombre} agregado al carrito`)
  }

  const handleEliminar = async () => {
    const confirmado = await confirm({
      titulo: '¿Eliminar producto?',
      mensaje: `Se va a eliminar "${producto.nombre}". Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    })

    if (!confirmado) return

    try {
      await ProductService.remove(id)
      toast.success('Producto eliminado')
      navigate('/productos')
    } catch (err) {
      toast.error(err.detalle || 'No se pudo eliminar el producto')
    }
  }

  if (loading) {
    return (
      <ModernLayout>
        <div className="content-card">
          <p className="loading" role="status">
            Cargando producto…
          </p>
        </div>
      </ModernLayout>
    )
  }

  if (error || !producto) {
    return (
      <ModernLayout>
        <div className="content-card estado-vacio">
          <h1>Producto no disponible</h1>
          <p className="error-message" role="alert">
            {error || 'El producto que buscás no existe o fue dado de baja.'}
          </p>
          <Link to="/productos" className="explore-button">
            Volver al catálogo
          </Link>
        </div>
      </ModernLayout>
    )
  }

  const sinStock = producto.stock === 0
  const detalles = Object.entries(producto.detalles || {})

  return (
    <ModernLayout title={producto.nombre}>
      <div className="content-card">
        <Link to="/productos" className="btn btn-secondary">
          ← Volver al catálogo
        </Link>

        <div className="producto-detalle">
          <div className="producto-detalle__imagen">
            {producto.imagenUrl && (
              <img
                src={producto.imagenUrl}
                alt={producto.nombre}
                onError={(evento) => {
                  evento.target.style.visibility = 'hidden'
                }}
              />
            )}
          </div>

          <div className="producto-detalle__info">
            <h1>{producto.nombre}</h1>
            <p className="producto-detalle__descripcion">
              {producto.descripcion}
            </p>

            {detalles.length > 0 && (
              <section className="especificaciones">
                <h2>Especificaciones técnicas</h2>
                <dl>
                  {detalles.map(([clave, valor]) => (
                    <div key={clave} className="especificaciones__fila">
                      <dt>{clave}</dt>
                      <dd>{valor}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <p className="producto-detalle__precio">
              {formatearPrecio(producto.precio)}
            </p>

            <p
              className={`producto-detalle__stock ${sinStock ? 'is-agotado' : ''}`}
            >
              {sinStock
                ? 'Sin stock'
                : `Stock disponible: ${producto.stock} ${
                    producto.stock === 1 ? 'pieza' : 'piezas'
                  }`}
            </p>

            <div className="producto-detalle__acciones">
              <button
                type="button"
                onClick={handleAgregar}
                className="explore-button"
                disabled={sinStock}
              >
                🛒 Agregar al carrito
              </button>

              <Link to="/carrito" className="btn btn-secondary">
                Ver carrito
              </Link>

              {/* Antes decía `user?.rol === 'admin'` — con una `rol` sin `e`.
                  El optional chaining hacía que fallara en silencio: el botón
                  no aparecía nunca, ni siquiera para un administrador. */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleEliminar}
                  className="btn btn-danger"
                >
                  🗑️ Eliminar producto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

export default ProductDetail
