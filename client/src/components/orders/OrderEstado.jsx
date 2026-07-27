import { COLOR_POR_ESTADO, ETIQUETA_ESTADO } from '../../constants'

/**
 * Chip con el estado actual del pedido.
 *
 * El `|| '#757575'` y el `|| pedido.estado` no son paranoia: si mañana el
 * backend agrega un estado y el espejo del cliente todavía no lo tiene, esto
 * muestra el valor crudo en gris en vez de romper la pantalla entera.
 */
function OrderEstado({ estado }) {
  return (
    <span
      className="pedido-card__estado"
      style={{ backgroundColor: COLOR_POR_ESTADO[estado] || '#757575' }}
    >
      {ETIQUETA_ESTADO[estado] || estado}
    </span>
  )
}

export default OrderEstado
