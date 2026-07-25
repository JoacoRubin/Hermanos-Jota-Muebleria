import { Link } from 'react-router-dom'
import { formatearPrecio } from '../../constants'

function ProductCard({ producto, onAgregar }) {
  const sinStock = producto.stock === 0

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

      <p className={`product-card__stock ${sinStock ? 'is-agotado' : ''}`}>
        {sinStock
          ? 'Sin stock'
          : `Stock: ${producto.stock} ${producto.stock === 1 ? 'pieza' : 'piezas'}`}
      </p>

      <div className="product-card__acciones">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onAgregar(producto)}
          disabled={sinStock}
        >
          🛒 Agregar
        </button>
        <Link to={`/productos/${producto.id}`} className="btn btn-secondary">
          Ver detalles
        </Link>
      </div>
    </article>
  )
}

export default ProductCard
