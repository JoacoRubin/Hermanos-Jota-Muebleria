import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ProductService from '../services/productService'
import ModernLayout from '../components/ModernLayout'
import { useCart } from '../contexts/CartContext'

function Products() {
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ProductService.getAllProducts()
      setProducts(data)
    } catch (err) {
      setError('Error al cargar los productos. Asegúrate de que el servidor esté ejecutándose.')
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ModernLayout>
        <div className="content-card">
          <div className="loading">Cargando productos...</div>
        </div>
      </ModernLayout>
    )
  }

  if (error) {
    return (
      <ModernLayout>
        <div className="content-card">
          <div className="error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={loadProducts} className="btn">
              Reintentar
            </button>
          </div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="content-card">
        <h1>Nuestros Muebles Artesanales</h1>
        
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', margin: '3rem 0' }}>
            <p>Nuestro catálogo artesanal está siendo preparado con el cuidado que cada pieza merece.</p>
            <p>¡Pronto tendremos increíbles muebles para ti!</p>
          </div>
        ) : (
        <>
          <div className="products-grid">
            {products.map((product) => (
              <div key={product._id} className="product-card">
                {product.imagenUrl && (
                  <Link to={`/productos/${product._id}`} className="product-image-link">
                    <img 
                      src={product.imagenUrl} 
                      alt={product.nombre}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                      className="product-image-clickable"
                    />
                  </Link>
                )}
                <Link to={`/productos/${product._id}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ cursor: 'pointer' }} className="product-title-clickable">{product.nombre}</h3>
                </Link>
                <p style={{ 
                  fontSize: '0.9rem', 
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {product.descripcion}
                </p>
                <p className="price">${product.precio?.toLocaleString('es-AR')}</p>
                <p style={{ fontSize: '0.9rem', color: product.stock > 0 ? 'var(--verde-salvia)' : 'var(--rosa-polvoriento)' }}>
                  {product.stock > 0 ? `Stock: ${product.stock} ${product.stock === 1 ? 'pieza' : 'piezas'}` : 'Sin stock'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => {
                      if (product.stock > 0) {
                        addToCart(product)
                        alert(`${product.nombre} agregado al carrito`)
                      } else {
                        alert('Producto sin stock')
                      }
                    }}
                    className="btn"
                    disabled={product.stock === 0}
                    style={{ 
                      backgroundColor: product.stock > 0 ? 'var(--verde-salvia)' : 'var(--texto-secundario)',
                      opacity: product.stock === 0 ? 0.5 : 1,
                      cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.8rem'
                    }}
                  >
                    🛒 Agregar
                  </button>
                  <Link to={`/productos/${product._id}`} className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                    Ver Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </ModernLayout>
  )
}

export default Products