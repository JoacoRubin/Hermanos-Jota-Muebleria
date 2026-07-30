import { Link } from 'react-router-dom'
import { formatearPrecio } from '../../constants'

/**
 * Ficha del catálogo.
 *
 * ⚠️ Este componente NO conoce la cantidad de stock, y no es que decida no
 * mostrarla: el número no está en `producto`. La API pública devuelve
 * `stockStatus` y `lowStockMessage` ya calculados por el servidor.
 *
 * Es la diferencia entre esconder un dato y no tenerlo. Un `{stock > 3 ? null
 * : ...}` acá dejaría el número igual en el JSON, a un F12 de distancia.
 */
function ProductCard({ producto, onAgregar }) {
  // `disponible` viene del servidor. No se calcula con `stock === 0` porque
  // `stock` no existe en esta respuesta.
  const sinStock = producto.disponible === false
  const esEscaso = producto.stockStatus === 'ultimas'

  return (
    <article className="product-card">
      {producto.imagenUrl && (
        <Link to={`/productos/${producto.id}`} className="product-image-link">
          <img
            src={producto.imagenUrl}
            alt={producto.nombre}
            loading="lazy"
            className="product-image-clickable"
            onError={(evento) => {
              evento.target.style.visibility = 'hidden'
            }}
          />
        </Link>
      )}

      <Link to={`/productos/${producto.id}`} className="product-title-link">
        <h3 className="product-title-clickable">{producto.nombre}</h3>
      </Link>

      <p className="product-card__descripcion">{producto.descripcion}</p>

      <p className="price">{formatearPrecio(producto.precio)}</p>

      {/* Solo hay línea de stock cuando hay algo que decir: agotado o escaso.
          Con stock normal no se muestra nada, que es justamente lo que el
          cliente NO tiene que saber. */}
      {producto.lowStockMessage && (
        <p
          className={`product-card__stock ${
            sinStock ? 'is-agotado' : 'is-escaso'
          }`}
          role={esEscaso ? 'status' : undefined}
        >
          {producto.lowStockMessage}
        </p>
      )}

      <div className="product-card__acciones">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onAgregar(producto)}
          disabled={sinStock}
        >
          <span aria-hidden="true">🛒</span> Agregar
        </button>
        <Link to={`/productos/${producto.id}`} className="btn btn-secondary">
          Ver detalles
        </Link>
      </div>
    </article>
  )
}

export default ProductCard
