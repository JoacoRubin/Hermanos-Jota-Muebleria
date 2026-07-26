import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ProductService from '../../services/productService'
import ModernLayout from '../../components/ModernLayout'
import { useUI } from '../../contexts/UIContext'
import {
  formatearPrecio,
  formatearFecha,
  UMBRAL_STOCK_BAJO,
  ETIQUETA_MOTIVO,
  MAX_REPOSICION_POR_MOVIMIENTO,
} from '../../constants'

/**
 * Gestión de stock.
 *
 * El formulario pide "cuántas unidades AGREGAR", no "cuántas hay en total", y
 * eso no es cosmético: el servidor hace `$inc`. Si pidiera el total, el admin
 * tendría que leer el número, hacer la cuenta y escribir el resultado — y una
 * venta que entre mientras tanto se borraría de un plumazo.
 *
 * Acá sí se muestra la cantidad exacta: esta pantalla es solo para admin y la
 * API le devuelve `stock` porque el token dice que lo es.
 */
function AdminStock() {
  const { toast } = useUI()

  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cantidad tipeada por producto, y cuál está guardando.
  const [cantidades, setCantidades] = useState({})
  const [guardando, setGuardando] = useState(null)

  // Historial desplegado: id del producto → movimientos (o null si carga).
  const [historial, setHistorial] = useState({})

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // `auth: true` es lo que hace que la respuesta traiga `stock`.
      const { productos: data } = await ProductService.getAll({
        limit: 100,
        auth: true,
      })
      setProductos(data)
    } catch (err) {
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  const handleAgregar = async (evento, producto) => {
    evento.preventDefault()

    const cantidad = Number(cantidades[producto.id])

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      toast.error('Ingresá una cantidad entera mayor a cero')
      return
    }

    setGuardando(producto.id)

    try {
      const actualizado = await ProductService.agregarStock(producto.id, {
        cantidad,
        motivo: 'reposicion',
      })

      // Se reemplaza solo el producto tocado en vez de recargar la lista
      // entera: la respuesta ya trae el estado nuevo y evita un viaje de más.
      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? actualizado : p))
      )
      setCantidades((prev) => ({ ...prev, [producto.id]: '' }))

      // Si el historial estaba abierto, queda viejo: se refresca.
      if (historial[producto.id]) await abrirHistorial(producto.id, true)

      toast.success(
        `+${cantidad} en "${producto.nombre}". Stock actual: ${actualizado.stock}`
      )
    } catch (err) {
      toast.error(err.detalle || 'No se pudo agregar el stock')
    } finally {
      setGuardando(null)
    }
  }

  const abrirHistorial = async (productoId, forzar = false) => {
    if (historial[productoId] && !forzar) {
      // Segundo click: se cierra.
      setHistorial((prev) => {
        const { [productoId]: _, ...resto } = prev
        return resto
      })
      return
    }

    setHistorial((prev) => ({ ...prev, [productoId]: null }))

    try {
      const { movimientos } = await ProductService.getMovimientos(productoId, {
        limit: 20,
      })
      setHistorial((prev) => ({ ...prev, [productoId]: movimientos }))
    } catch (err) {
      toast.error(err.detalle || 'No se pudo cargar el historial')
      setHistorial((prev) => {
        const { [productoId]: _, ...resto } = prev
        return resto
      })
    }
  }

  const claseStock = (stock) => {
    if (stock === 0) return 'is-agotado'
    if (stock <= UMBRAL_STOCK_BAJO) return 'is-escaso'
    return ''
  }

  return (
    <ModernLayout title="Gestión de stock">
      <div className="content-card">
        <header className="admin-header">
          <h1>Gestión de stock</h1>
          <Link to="/admin/crear-producto" className="btn btn-secondary">
            ➕ Crear producto
          </Link>
        </header>

        {loading && (
          <p className="loading" role="status">
            Cargando productos…
          </p>
        )}

        {error && !loading && (
          <div className="estado-vacio">
            <p className="error-message" role="alert">
              {error}
            </p>
            <button type="button" onClick={cargarProductos} className="explore-button">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <ul className="stock-lista">
            {productos.map((producto) => (
              <li key={producto.id} className="stock-fila">
                <div className="stock-fila__producto">
                  {producto.imagenUrl && (
                    <img
                      src={producto.imagenUrl}
                      alt=""
                      className="stock-fila__imagen"
                      onError={(evento) => {
                        evento.target.style.visibility = 'hidden'
                      }}
                    />
                  )}
                  <div>
                    <Link to={`/productos/${producto.id}`}>
                      <strong>{producto.nombre}</strong>
                    </Link>
                    <p className="stock-fila__precio">
                      {formatearPrecio(producto.precio)} · {producto.categoria}
                    </p>
                  </div>
                </div>

                <div className={`stock-fila__cantidad ${claseStock(producto.stock)}`}>
                  <span className="stock-fila__numero">{producto.stock}</span>
                  <span className="stock-fila__unidad">
                    {producto.stock === 1 ? 'unidad' : 'unidades'}
                  </span>
                  {producto.lowStockMessage && (
                    <span className="stock-fila__aviso">
                      El cliente ve: “{producto.lowStockMessage}”
                    </span>
                  )}
                </div>

                <form
                  className="stock-fila__form"
                  onSubmit={(evento) => handleAgregar(evento, producto)}
                >
                  <label htmlFor={`agregar-${producto.id}`} className="sr-only">
                    Unidades a agregar a {producto.nombre}
                  </label>
                  <input
                    type="number"
                    id={`agregar-${producto.id}`}
                    min="1"
                    step="1"
                    max={MAX_REPOSICION_POR_MOVIMIENTO}
                    placeholder="Agregar N"
                    value={cantidades[producto.id] ?? ''}
                    onChange={(evento) =>
                      setCantidades((prev) => ({
                        ...prev,
                        [producto.id]: evento.target.value,
                      }))
                    }
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={guardando === producto.id}
                  >
                    {guardando === producto.id ? '…' : '+ Sumar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => abrirHistorial(producto.id)}
                    aria-expanded={Boolean(historial[producto.id])}
                  >
                    {producto.id in historial ? 'Ocultar' : 'Historial'}
                  </button>
                </form>

                {producto.id in historial && (
                  <div className="stock-fila__historial">
                    {historial[producto.id] === null ? (
                      <p className="loading" role="status">
                        Cargando movimientos…
                      </p>
                    ) : historial[producto.id].length === 0 ? (
                      <p>Sin movimientos registrados.</p>
                    ) : (
                      <table className="movimientos-tabla">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Motivo</th>
                            <th>Cantidad</th>
                            <th>Stock</th>
                            <th>Usuario</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historial[producto.id].map((m) => (
                            <tr key={m.id}>
                              <td>
                                {formatearFecha(m.createdAt, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td>{ETIQUETA_MOTIVO[m.motivo] || m.motivo}</td>
                              <td
                                className={
                                  m.cantidad > 0
                                    ? 'movimiento-positivo'
                                    : 'movimiento-negativo'
                                }
                              >
                                {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                              </td>
                              <td>{m.stockResultante}</td>
                              <td>{m.usuario?.nombre || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModernLayout>
  )
}

export default AdminStock
