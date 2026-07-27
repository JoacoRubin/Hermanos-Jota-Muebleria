import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ProductService from '../services/productService'
import ModernLayout from '../components/ModernLayout'
import useAgregarAlCarrito from '../hooks/useAgregarAlCarrito'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'
import { formatearPrecio } from '../constants'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast, confirm } = useUI()

  const [producto, setProducto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargarProducto = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Solo se manda el token si es admin: es la única vez que la respuesta
      // cambia según quién pregunta (viene con `stock`). Para el resto es una
      // lectura pública y no hay razón para adjuntar credenciales.
      setProducto(await ProductService.getById(id, { auth: isAdmin }))
    } catch (err) {
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }, [id, isAdmin])

  useEffect(() => {
    cargarProducto()
  }, [cargarProducto])

  // Si no hay sesión, esto no agrega nada: manda a crear la cuenta.
  const agregarAlCarrito = useAgregarAlCarrito()
  const handleAgregar = () => agregarAlCarrito(producto)

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

  // `disponible` y `lowStockMessage` los calcula el servidor. La cantidad
  // exacta solo viene si el que mira es admin (`producto.stock`), y en ese
  // caso se muestra aparte, marcada como dato interno.
  const sinStock = producto.disponible === false
  const esEscaso = producto.stockStatus === 'ultimas'
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

            {/* Igual que en la tarjeta del catálogo: solo se dice algo cuando
                hay algo que decir. Con stock normal, silencio. */}
            {producto.lowStockMessage && (
              <p
                className={`producto-detalle__stock ${
                  sinStock ? 'is-agotado' : 'is-escaso'
                }`}
                role={esEscaso ? 'status' : undefined}
              >
                {producto.lowStockMessage}
              </p>
            )}

            {/* El número exacto solo llega si la API lo mandó, y la API solo
                se lo manda al admin. Se rotula como dato interno para que
                nadie lo confunda con algo que ve el cliente. */}
            {typeof producto.stock === 'number' && (
              <p className="producto-detalle__stock-admin">
                🔒 Stock real (solo admin): {producto.stock}{' '}
                {producto.stock === 1 ? 'unidad' : 'unidades'}
              </p>
            )}

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
