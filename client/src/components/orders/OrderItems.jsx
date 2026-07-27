import { formatearPrecio } from '../../constants'

/**
 * Lista de productos de un pedido, con cantidades y subtotales.
 *
 * Era el mismo bloque, carácter por carácter, en `MisPedidos` y en
 * `AdminPedidos`. Presentacional puro: recibe los ítems y no sabe de servicios
 * ni de contextos.
 */
function OrderItems({ items, cantidadTotal }) {
  return (
    <div className="pedido-card__items">
      <h3>
        Productos ({cantidadTotal}{' '}
        {cantidadTotal === 1 ? 'artículo' : 'artículos'})
      </h3>
      <ul>
        {items.map((item) => (
          <li key={item.productoId} className="pedido-item">
            <span>
              {item.nombre}{' '}
              <span className="pedido-item__cantidad">×{item.cantidad}</span>
            </span>
            <span className="pedido-item__subtotal">
              {formatearPrecio(item.subtotal)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default OrderItems
