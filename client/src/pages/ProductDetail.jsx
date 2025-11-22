import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ProductService from '../services/productService'
import ModernLayout from '../components/ModernLayout'
import { useCart } from '../contexts/CartContext'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ProductService.getProductById(id)
      setProduct(data)
    } catch (err) {
      setError('Error al cargar el producto.')
      console.error('Error loading product:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (product.stock > 0) {
      addToCart(product)
      alert(`¡${product.nombre} agregado al carrito exitosamente!`)
    } else {
      alert('Lo sentimos, este producto no tiene stock disponible')
    }
  }

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar "${product.nombre}"?\n\nEsta acción no se puede deshacer.`
    )
    
    if (confirmDelete) {
      try {
        await ProductService.deleteProduct(id)
        alert('Producto eliminado exitosamente')
        navigate('/productos')
      } catch (err) {
        alert('Error al eliminar el producto. Por favor, intenta nuevamente.')
        console.error('Error deleting product:', err)
      }
    }
  }


  if (loading) {
    return (
      <ModernLayout>
        <div className="content-card">
          <div className="loading">Cargando producto...</div>
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
            <Link to="/productos" className="btn">
              Volver al Catálogo
            </Link>
          </div>
        </div>
      </ModernLayout>
    )
  }

  if (!product) {
    return (
      <ModernLayout>
        <div className="content-card">
          <div className="error">
            <h2>Producto no encontrado</h2>
            <p>El producto que buscas no existe o ha sido eliminado.</p>
            <Link to="/productos" className="btn">
              Volver al Catálogo
            </Link>
          </div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="content-card">
        <Link to="/productos" className="btn" style={{ marginBottom: '2rem' }}>
          ← Volver al Catálogo
        </Link>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem',
        alignItems: 'start',
        marginTop: '1.5rem',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div>
          {product.imagenUrl && (
            <img 
              src={product.imagenUrl} 
              alt={product.nombre}
              style={{ 
                width: '100%', 
                maxWidth: '300px',
                height: 'auto',
                borderRadius: '8px'
              }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          )}
        </div>
        
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>{product.nombre}</h1>
          <p style={{ fontSize: '0.95rem', margin: '0.8rem 0', color: 'var(--texto-secundario)', lineHeight: '1.5' }}>
            {product.descripcion}
          </p>
          
          {/* Detalles técnicos si están disponibles */}
          {product.detalles && (
            <div style={{ 
              background: 'var(--fondo-tarjeta)', 
              padding: '1rem', 
              borderRadius: '8px', 
              margin: '1rem 0',
              border: '1px solid rgba(160, 82, 45, 0.1)'
            }}>
              <h3 style={{ color: 'var(--siena-tostado)', marginBottom: '0.8rem', fontSize: '1rem' }}>
                Especificaciones Técnicas
              </h3>
              {Object.entries(product.detalles).map(([key, value]) => (
                <div key={key} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.4rem 0',
                  borderBottom: '1px solid rgba(160, 82, 45, 0.05)',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ fontWeight: '500', color: 'var(--texto-principal)' }}>{key}:</span>
                  <span style={{ color: 'var(--texto-secundario)' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ margin: '1.2rem 0' }}>
            <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--vara-de-oro)' }}>
              ${product.precio?.toLocaleString('es-AR')}
            </p>
            <p style={{ fontSize: '0.95rem', color: product.stock > 0 ? 'var(--verde-salvia)' : 'var(--rosa-polvoriento)' }}>
              {product.stock > 0 ? `Stock disponible: ${product.stock} ${product.stock === 1 ? 'pieza' : 'piezas'}` : 'Sin stock'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              onClick={handleAddToCart}
              className="explore-button"
              disabled={product.stock === 0}
              style={{ 
                opacity: product.stock === 0 ? 0.5 : 1,
                cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                padding: '0.6rem 1rem',
                fontWeight: 'bold'
              }}
            >
              🛒 Agregar al Carrito
            </button>
            
            <Link 
              to="/carrito" 
              className="btn"
              style={{ 
                backgroundColor: 'var(--siena-tostado)',
                color: 'white',
                textDecoration: 'none',
                padding: '0.6rem 1rem',
                fontSize: '0.9rem'
              }}
            >
              Ver Carrito
            </Link>

            <button 
              onClick={handleDelete}
              className="btn"
              style={{ 
                backgroundColor: '#c33',
                color: 'white',
                padding: '0.6rem 1rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🗑️ Eliminar Producto
            </button>
          </div>
        </div>
      </div>
      </div>
    </ModernLayout>
  )
}

export default ProductDetail