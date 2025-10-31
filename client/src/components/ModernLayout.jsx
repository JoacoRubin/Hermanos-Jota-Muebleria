import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'

function ModernLayout({ children, title }) {
  const location = useLocation()
  const { getTotalItems } = useCart()
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : ''
  }

  return (
    <div className="modern-layout">
      {/* Header Section */}
      <div className="modern-header">
        <div className="header-brand-section">
          <img 
            src="/images/logo.svg" 
            alt="Logo Hermanos Jota" 
            className="header-logo-small"
            onError={(e) => {
              e.target.src = '/images/logo-placeholder.svg'
            }}
          />
          <h1 className="modern-title">Mueblería Hermanos JOTA</h1>
        </div>
        <div className="modern-nav">
          <Link to="/" className={`nav-link ${isActive('/')}`}>Inicio</Link>
          <Link to="/productos" className={`nav-link ${isActive('/productos')}`}>Productos</Link>
          <Link to="/contacto" className={`nav-link ${isActive('/contacto')}`}>Contacto</Link>
          <Link to="/carrito" className="cart-button">🛒 Carrito ({getTotalItems()})</Link>
        </div>
      </div>

      {/* Content */}
      {children}

      {/* Footer */}
      <div className="modern-footer">
        <p>Hermanos Jota • Av. San Juan 2847, CABA • info@hermanosjota.com.ar • © 2025</p>
      </div>
    </div>
  )
}

export default ModernLayout