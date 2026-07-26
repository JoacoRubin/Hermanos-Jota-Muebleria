import { FLUJO_PEDIDO, ETIQUETA_ESTADO, formatearFecha } from '../../constants'

/**
 * Línea de tiempo del pedido: pasos completados, actual y pendientes.
 *
 * Presentacional puro: recibe el estado y el historial, no sabe de servicios
 * ni de contextos. Se puede renderizar en un test sin montar media aplicación.
 *
 * La fecha de cada paso sale del HISTORIAL, no se inventa. Un paso sin entrada
 * en el historial se dibuja sin fecha en lugar de mostrar la del pedido: decir
 * "entregado el 3 de marzo" cuando esa fecha es la de creación es peor que no
 * decir nada.
 */
function OrderTimeline({ estado, historialEstados = [] }) {
  // Primera aparición de cada estado. Si un pedido pasó dos veces por el mismo
  // estado (no debería, pero el dato es histórico y puede venir de la
  // migración), vale la primera: es cuando ese hito ocurrió.
  const fechaPorEstado = historialEstados.reduce((acc, entrada) => {
    if (!(entrada.estado in acc)) acc[entrada.estado] = entrada.fecha
    return acc
  }, {})

  // ── Pedido cancelado ────────────────────────────────────────────────────
  // No se dibuja el recorrido con una cruz encima: el pedido SALIÓ del flujo.
  // Se muestra hasta dónde llegó y dónde se cortó, que es la información real.
  if (estado === 'cancelado') {
    const recorridos = FLUJO_PEDIDO.filter((paso) => paso in fechaPorEstado)

    return (
      <ol className="timeline timeline--cancelado">
        {recorridos.map((paso) => (
          <li key={paso} className="timeline__paso is-completado">
            <span className="timeline__marca" aria-hidden="true">
              ✓
            </span>
            <div className="timeline__texto">
              <span className="timeline__etiqueta">
                {ETIQUETA_ESTADO[paso]}
              </span>
              <span className="timeline__fecha">
                {formatearFecha(fechaPorEstado[paso], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </li>
        ))}

        <li className="timeline__paso is-cancelado">
          <span className="timeline__marca" aria-hidden="true">
            ✕
          </span>
          <div className="timeline__texto">
            <span className="timeline__etiqueta">Cancelado</span>
            <span className="timeline__fecha">
              {formatearFecha(fechaPorEstado.cancelado, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </li>
      </ol>
    )
  }

  const indiceActual = FLUJO_PEDIDO.indexOf(estado)

  return (
    <ol className="timeline">
      {FLUJO_PEDIDO.map((paso, indice) => {
        const completado = indice < indiceActual
        const actual = indice === indiceActual
        const fecha = fechaPorEstado[paso]

        const clase = completado
          ? 'is-completado'
          : actual
            ? 'is-actual'
            : 'is-pendiente'

        return (
          <li key={paso} className={`timeline__paso ${clase}`}>
            <span className="timeline__marca" aria-hidden="true">
              {completado ? '✓' : actual ? '●' : '○'}
            </span>
            <div className="timeline__texto">
              <span className="timeline__etiqueta">
                {ETIQUETA_ESTADO[paso]}
                {/* El lector de pantalla necesita el estado en palabras: el
                    check y el círculo son decorativos. */}
                {actual && <span className="sr-only"> (estado actual)</span>}
              </span>
              <span className="timeline__fecha">
                {fecha
                  ? formatearFecha(fecha, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default OrderTimeline
