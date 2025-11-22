import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

function ModernLayout({ children, title }) {
  const location = useLocation()
  const { getTotalItems } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : ''
  }

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout()
      alert('Sesión cerrada exitosamente')
    }
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
          <Link to="/" className={`nav-link ${isActive('/')}`}>🏠 Inicio</Link>
          <Link to="/productos" className={`nav-link ${isActive('/productos')}`}>📦 Productos</Link>
          <Link to="/contacto" className={`nav-link ${isActive('/contacto')}`}>📞 Contacto</Link>
          
          {isAuthenticated() ? (
            <>
              <Link to="/carrito" className={`nav-link ${isActive('/carrito')}`}>🛒 Carrito ({getTotalItems()})</Link>
              <Link to="/mis-pedidos" className={`nav-link ${isActive('/mis-pedidos')}`}>📦 Mis Pedidos</Link>
              <Link to="/perfil" className={`nav-link ${isActive('/perfil')}`}>👤 Mi Perfil</Link>
              {user?.role === 'admin' && (
                <Link to="/admin/crear-producto" className={`nav-link ${isActive('/admin/crear-producto')}`}>
                  ➕ Crear Producto
                </Link>
              )}
              <button onClick={handleLogout} className="nav-link nav-button logout-button">
                🚪 Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`nav-link ${isActive('/login')}`}>🔐 Iniciar Sesión</Link>
              <Link to="/registro" className={`nav-link ${isActive('/registro')}`}>📝 Registrarse</Link>
            </>
          )}
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