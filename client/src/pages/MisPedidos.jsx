import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import OrderService from '../services/orderService'
import ModernLayout from '../components/ModernLayout'
import { formatearPrecio, formatearFecha, COLOR_POR_ESTADO } from '../constants'

function MisPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargarPedidos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { pedidos: data } = await OrderService.getUserOrders()
      setPedidos(data)
    } catch (err) {
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarPedidos()
  }, [cargarPedidos])

  if (loading) {
    return (
      <ModernLayout title="Mis Pedidos">
        <div className="content-card">
          <h1>Mis pedidos</h1>
          <p className="loading" role="status">
            Cargando pedidos…
          </p>
        </div>
      </ModernLayout>
    )
  }

  if (error) {
    return (
      <ModernLayout title="Mis Pedidos">
        <div className="content-card estado-vacio">
          <h1>Mis pedidos</h1>
          <p className="error-message" role="alert">
            {error}
          </p>
          <button type="button" onClick={cargarPedidos} className="explore-button">
            Reintentar
          </button>
        </div>
      </ModernLayout>
    )
  }

  if (pedidos.length === 0) {
    return (
      <ModernLayout title="Mis Pedidos">
        <div className="content-card estado-vacio">
          <div className="estado-vacio__icono" aria-hidden="true">
            📦
          </div>
          <h1>Todavía no tenés pedidos</h1>
          <p>Empezá a explorar nuestro catálogo.</p>
          <Link to="/productos" className="explore-button">
            Ver productos
          </Link>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout title="Mis Pedidos">
      <div className="content-card">
        <h1>Mis pedidos</h1>

        <div className="pedidos-lista">
          {pedidos.map((pedido) => (
            <article key={pedido.id} className="pedido-card">
              <header className="pedido-card__header">
                <div>
                  <h2 className="pedido-card__numero">
                    Pedido #{pedido.id.slice(-8).toUpperCase()}
                  </h2>
                  <p className="pedido-card__fecha">
                    {/* Antes leía `order.fechaPedido`, un campo que nunca
                        existió: el schema usa timestamps, así que es
                        `createdAt`. En pantalla se veía "Invalid Date". */}
                    {formatearFecha(pedido.createdAt, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <span
                  className="pedido-card__estado"
                  style={{
                    backgroundColor:
                      COLOR_POR_ESTADO[pedido.estado] || '#757575',
                  }}
                >
                  {pedido.estado}
                </span>
              </header>

              <div className="pedido-card__items">
                <h3>
                  Productos ({pedido.cantidadTotal}{' '}
                  {pedido.cantidadTotal === 1 ? 'artículo' : 'artículos'})
                </h3>
                <ul>
                  {pedido.items.map((item) => (
                    <li key={item.productoId} className="pedido-item">
                      <span>
                        {item.nombre}{' '}
                        <span className="pedido-item__cantidad">
                          ×{item.cantidad}
                        </span>
                      </span>
                      <span className="pedido-item__subtotal">
                        {formatearPrecio(item.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <footer className="pedido-card__footer">
                <div>
                  <p className="pedido-card__label">📍 Envío a:</p>
                  <p>{pedido.direccionEnvio}</p>
                </div>
                <div className="pedido-card__total">
                  <p className="pedido-card__label">Total</p>
                  <p>{formatearPrecio(pedido.total)}</p>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </ModernLayout>
  )
}

export default MisPedidos
