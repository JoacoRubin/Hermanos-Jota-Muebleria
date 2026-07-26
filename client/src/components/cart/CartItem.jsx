import { formatearPrecio } from '../../constants'

/**
 * Presentacional puro: recibe datos y callbacks, no sabe de contextos ni de
 * servicios. Se puede renderizar en un test sin montar media aplicación.
 */
function CartItem({ item, onCambiarCantidad, onEliminar }) {
  // `tope` reemplazó a `stock`: la API ya no devuelve la cantidad exacta, así
  // que el límite sale de `unidadesRestantes` (solo cuando quedan pocas) o del
  // máximo por ítem. Ver `topeDe` en CartContext.
  const enElTope = typeof item.tope === 'number' && item.cantidad >= item.tope

  return (
    <li className="cart-item">
      {item.imagenUrl && (
        <img
          className="cart-item__imagen"
          src={item.imagenUrl}
          alt={item.nombre}
          onError={(evento) => {
            evento.target.style.visibility = 'hidden'
          }}
        />
      )}

      <div className="cart-item__info">
        <h3 className="cart-item__nombre">{item.nombre}</h3>
        <p className="cart-item__unitario">
          {formatearPrecio(item.precio)} c/u
        </p>
      </div>

      <div className="cart-item__cantidad">
        <button
          type="button"
          onClick={() => onCambiarCantidad(item.id, item.cantidad - 1)}
          aria-label={`Quitar una unidad de ${item.nombre}`}
        >
          −
        </button>
        <span aria-live="polite" aria-label={`Cantidad: ${item.cantidad}`}>
          {item.cantidad}
        </span>
        <button
          type="button"
          onClick={() => onCambiarCantidad(item.id, item.cantidad + 1)}
          disabled={enElTope}
          title={enElTope ? 'No podés agregar más unidades' : undefined}
          aria-label={`Agregar una unidad de ${item.nombre}`}
        >
          +
        </button>
      </div>

      <p className="cart-item__subtotal">
        {formatearPrecio(item.precio * item.cantidad)}
      </p>

      <button
        type="button"
        className="cart-item__eliminar"
        onClick={() => onEliminar(item.id)}
        aria-label={`Eliminar ${item.nombre} del carrito`}
      >
        🗑️
      </button>
    </li>
  )
}

export default CartItem
