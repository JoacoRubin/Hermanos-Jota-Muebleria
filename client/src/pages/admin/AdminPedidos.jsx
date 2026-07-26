import { useState, useEffect, useCallback } from 'react'
import OrderService from '../../services/orderService'
import ModernLayout from '../../components/ModernLayout'
import { useUI } from '../../contexts/UIContext'
import {
  formatearPrecio,
  formatearFecha,
  COLOR_POR_ESTADO,
  ETIQUETA_ESTADO,
  ACCION_HACIA_ESTADO,
  TRANSICIONES_PEDIDO,
  GRUPOS_MIS_PEDIDOS,
} from '../../constants'

/**
 * Panel de pedidos entrantes.
 *
 * Los botones que se muestran salen de `TRANSICIONES_PEDIDO`, el mismo mapa
 * que el backend usa para decidir. Eso evita ofrecer una acción que el
 * servidor va a rechazar con 409.
 *
 * Pero que la UI lo consulte NO es la validación: el servidor revalida
 * siempre. Si mañana alguien agrega un botón a mano, o pega un `curl`, la
 * transición inválida se rechaza igual. Esconder un botón no protege nada.
 */
function AdminPedidos() {
  const { toast, confirm } = useUI()

  const [grupo, setGrupo] = useState('pendientes')
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [procesando, setProcesando] = useState(null)

  // Datos del despacho, por pedido. Se guardan en un mapa y no en el pedido
  // para no mutar lo que vino del servidor mientras el admin tipea.
  const [despachos, setDespachos] = useState({})

  const cargarPedidos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { pedidos: data } = await OrderService.getAllOrders({
        grupo,
        limit: 50,
      })
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

  const datosDespacho = (pedidoId) =>
    despachos[pedidoId] || { numero: '', transportista: '' }

  const actualizarDespacho = (pedidoId, campo, valor) => {
    setDespachos((prev) => ({
      ...prev,
      [pedidoId]: { ...datosDespacho(pedidoId), [campo]: valor },
    }))
  }

  const handleTransicion = async (pedido, estado) => {
    if (estado === 'cancelado') {
      const confirmado = await confirm({
        titulo: '¿Cancelar el pedido?',
        mensaje:
          'Las unidades vuelven al stock y el pedido queda cerrado. ' +
          'Esta acción no se puede deshacer.',
        textoConfirmar: 'Sí, cancelar',
        textoCancelar: 'No',
        peligroso: true,
      })
      if (!confirmado) return
    }

    setProcesando(pedido.id)

    try {
      // El seguimiento solo se manda al despachar, y solo si se cargó algo:
      // un objeto vacío pisaría datos que ya estaban.
      const { numero, transportista } = datosDespacho(pedido.id)
      const seguimiento =
        estado === 'despachado' && (numero.trim() || transportista.trim())
          ? { numero: numero.trim(), transportista: transportista.trim() }
          : undefined

      await OrderService.updateOrderStatus(pedido.id, { estado, seguimiento })

      toast.success(`Pedido marcado como "${ETIQUETA_ESTADO[estado]}"`)
      await cargarPedidos()
    } catch (err) {
      // Un 409 acá casi siempre significa que la pantalla tenía datos viejos:
      // el pedido cambió de estado en otra pestaña o lo canceló el cliente.
      toast.error(err.detalle || 'No se pudo actualizar el pedido')
      await cargarPedidos()
    } finally {
      setProcesando(null)
    }
  }

  return (
    <ModernLayout title="Pedidos">
      <div className="content-card">
        <h1>Pedidos</h1>

        <div className="pedidos-tabs" role="tablist" aria-label="Filtrar pedidos">
          {GRUPOS_MIS_PEDIDOS.map(({ clave, etiqueta }) => (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={grupo === clave}
              className={`pedidos-tab ${grupo === clave ? 'is-activa' : ''}`}
              onClick={() => setGrupo(clave)}
            >
              {clave === 'pendientes' ? 'En curso' : etiqueta}
            </button>
          ))}
        </div>

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
            <button type="button" onClick={cargarPedidos} className="explore-button">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && pedidos.length === 0 && (
          <div className="estado-vacio">
            <div className="estado-vacio__icono" aria-hidden="true">
              📭
            </div>
            <h2>No hay pedidos en esta pestaña</h2>
          </div>
        )}

        {!loading && !error && pedidos.length > 0 && (
          <div className="pedidos-lista">
            {pedidos.map((pedido) => {
              const siguientes = TRANSICIONES_PEDIDO[pedido.estado] || []
              const enCurso = procesando === pedido.id
              const puedeDespachar = siguientes.includes('despachado')

              return (
                <article key={pedido.id} className="pedido-card">
                  <header className="pedido-card__header">
                    <div>
                      <h2 className="pedido-card__numero">
                        Pedido #{pedido.id.slice(-8).toUpperCase()}
                      </h2>
                      <p className="pedido-card__fecha">
                        {formatearFecha(pedido.createdAt, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="pedido-card__cliente">
                        👤 {pedido.usuario?.nombre || 'Cliente'}
                        {pedido.usuario?.email && ` · ${pedido.usuario.email}`}
                      </p>
                    </div>

                    <span
                      className="pedido-card__estado"
                      style={{
                        backgroundColor:
                          COLOR_POR_ESTADO[pedido.estado] || '#757575',
                      }}
                    >
                      {ETIQUETA_ESTADO[pedido.estado] || pedido.estado}
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
                      {pedido.notas && (
                        <p className="pedido-card__notas">📝 {pedido.notas}</p>
                      )}
                    </div>
                    <div className="pedido-card__total">
                      <p className="pedido-card__label">Total</p>
                      <p>{formatearPrecio(pedido.total)}</p>
                    </div>
                  </footer>

                  {pedido.seguimiento?.numero && (
                    <p className="pedido-card__tracking">
                      🚚 {pedido.seguimiento.transportista || 'Envío'} ·{' '}
                      <strong>{pedido.seguimiento.numero}</strong>
                    </p>
                  )}

                  {/* Los datos de seguimiento aparecen solo cuando el próximo
                      paso posible es despachar. Son opcionales: se puede
                      despachar sin número de tracking. */}
                  {puedeDespachar && (
                    <div className="despacho-form">
                      <div className="form-group">
                        <label htmlFor={`transportista-${pedido.id}`}>
                          Transportista (opcional)
                        </label>
                        <input
                          type="text"
                          id={`transportista-${pedido.id}`}
                          value={datosDespacho(pedido.id).transportista}
                          onChange={(evento) =>
                            actualizarDespacho(
                              pedido.id,
                              'transportista',
                              evento.target.value
                            )
                          }
                          maxLength={80}
                          placeholder="Ej: Andreani"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`tracking-${pedido.id}`}>
                          N° de seguimiento (opcional)
                        </label>
                        <input
                          type="text"
                          id={`tracking-${pedido.id}`}
                          value={datosDespacho(pedido.id).numero}
                          onChange={(evento) =>
                            actualizarDespacho(
                              pedido.id,
                              'numero',
                              evento.target.value
                            )
                          }
                          maxLength={80}
                          placeholder="Ej: AR-998877"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pedido-card__acciones">
                    {siguientes.length === 0 ? (
                      <p className="pedido-card__cerrado">
                        Estado final: este pedido ya no admite cambios.
                      </p>
                    ) : (
                      siguientes.map((estado) => (
                        <button
                          key={estado}
                          type="button"
                          className={`btn ${
                            estado === 'cancelado'
                              ? 'btn-danger'
                              : 'btn-primary'
                          }`}
                          onClick={() => handleTransicion(pedido, estado)}
                          disabled={enCurso}
                        >
                          {enCurso
                            ? 'Procesando…'
                            : ACCION_HACIA_ESTADO[estado] ||
                              ETIQUETA_ESTADO[estado]}
                        </button>
                      ))
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </ModernLayout>
  )
}

export default AdminPedidos
