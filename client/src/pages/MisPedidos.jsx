import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import OrderService from '../services/orderService'
import ModernLayout from '../components/ModernLayout'
import OrderTimeline from '../components/orders/OrderTimeline'
import OrderTabs from '../components/orders/OrderTabs'
import OrderItems from '../components/orders/OrderItems'
import OrderEstado from '../components/orders/OrderEstado'
import { useUI } from '../contexts/UIContext'
import { formatearPrecio, formatearFecha } from '../constants'

const VACIO_POR_GRUPO = {
  pendientes: {
    icono: '📦',
    titulo: 'No tenés pedidos en curso',
    texto: 'Cuando hagas uno, vas a poder seguirlo desde acá.',
  },
  entregados: {
    icono: '✅',
    titulo: 'Todavía no recibiste ningún pedido',
    texto: 'Los pedidos entregados quedan archivados en esta pestaña.',
  },
  cancelados: {
    icono: '🗂️',
    titulo: 'No cancelaste ningún pedido',
    texto: 'Mejor así.',
  },
}

function MisPedidos() {
  const { toast, confirm } = useUI()

  const [grupo, setGrupo] = useState('pendientes')
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelando, setCancelando] = useState(null)

  /**
   * El filtro por pestaña se manda al SERVIDOR (`?grupo=`).
   *
   * Traer todos los pedidos y filtrarlos acá rompería la paginación: la
   * página 1 de "cancelados" saldría de los 20 pedidos más recientes de
   * cualquier estado, y la pestaña se vería vacía teniendo pedidos cancelados
   * un poco más viejos.
   */
  const cargarPedidos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { pedidos: data } = await OrderService.getUserOrders({ grupo })
      setPedidos(data)
    } catch (err) {
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }, [grupo])

  useEffect(() => {
    cargarPedidos()
  }, [cargarPedidos])

  const handleCancelar = async (pedido) => {
    const confirmado = await confirm({
      titulo: '¿Cancelar el pedido?',
      mensaje:
        `Se va a cancelar el pedido #${pedido.id.slice(-8).toUpperCase()} ` +
        'y los productos vuelven a estar disponibles. Esta acción no se puede deshacer.',
      textoConfirmar: 'Sí, cancelar',
      textoCancelar: 'No, dejarlo',
      peligroso: true,
    })

    if (!confirmado) return

    setCancelando(pedido.id)

    try {
      await OrderService.cancelOrder(pedido.id)
      toast.success('Pedido cancelado. Las unidades volvieron al stock.')
      // Se recarga en vez de tocar el estado local: el pedido cancelado sale
      // de la pestaña "Pendientes", así que la lista ya no es la misma.
      await cargarPedidos()
    } catch (err) {
      // El 409 acá es información útil, no un fallo de la app: significa que
      // el pedido avanzó mientras la pantalla mostraba datos viejos.
      toast.error(err.detalle || 'No se pudo cancelar el pedido')
      await cargarPedidos()
    } finally {
      setCancelando(null)
    }
  }

  const vacio = VACIO_POR_GRUPO[grupo]

  return (
    <ModernLayout title="Mis Pedidos">
      <div className="content-card">
        <h1>Mis pedidos</h1>

        <OrderTabs grupo={grupo} onCambiar={setGrupo} />

        {loading && (
          <p className="loading" role="status">
            Cargando pedidos…
          </p>
        )}

        {error && !loading && (
          <div className="estado-vacio">
            <p className="error-message" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={cargarPedidos}
              className="explore-button"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && pedidos.length === 0 && (
          <div className="estado-vacio">
            <div className="estado-vacio__icono" aria-hidden="true">
              {vacio.icono}
            </div>
            <h2>{vacio.titulo}</h2>
            <p>{vacio.texto}</p>
            <Link to="/productos" className="explore-button">
              Ver productos
            </Link>
          </div>
        )}

        {!loading && !error && pedidos.length > 0 && (
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

                  <OrderEstado estado={pedido.estado} />
                </header>

                <section className="pedido-card__seguimiento">
                  <h3 className="pedido-card__label">Seguimiento</h3>
                  <OrderTimeline
                    estado={pedido.estado}
                    historialEstados={pedido.historialEstados}
                  />

                  {pedido.seguimiento?.numero && (
                    <p className="pedido-card__tracking">
                      🚚 {pedido.seguimiento.transportista || 'Envío'} ·{' '}
                      <strong>{pedido.seguimiento.numero}</strong>
                    </p>
                  )}

                  {pedido.motivoCancelacion && (
                    <p className="pedido-card__motivo">
                      Motivo: {pedido.motivoCancelacion}
                    </p>
                  )}
                </section>

                <OrderItems
                  items={pedido.items}
                  cantidadTotal={pedido.cantidadTotal}
                />

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

                {/* `puedeCancelarCliente` lo calcula el servidor. Ocultar el
                    botón es cortesía: el permiso lo revalida el endpoint. */}
                {pedido.puedeCancelarCliente && (
                  <div className="pedido-card__acciones">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleCancelar(pedido)}
                      disabled={cancelando === pedido.id}
                    >
                      {cancelando === pedido.id
                        ? 'Cancelando…'
                        : 'Cancelar pedido'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </ModernLayout>
  )
}

export default MisPedidos
