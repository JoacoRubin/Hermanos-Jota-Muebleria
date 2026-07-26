import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'

/**
 * Cabecera, navegación y pie, compartidos por todas las pantallas.
 *
 * ⚠️ OJO CON QUÉ SE PONE ACÁ ADENTRO.
 *
 * Cada página renderiza su PROPIO `<ModernLayout>` en lugar de colgar de una
 * ruta de layout con `<Outlet />`. Consecuencia: al navegar, React desmonta el
 * layout de la página anterior y monta uno nuevo. Todo `useState` que viva
 * dentro se pierde en cada click del menú.
 *
 * Para el header y el footer da igual: no tienen estado. Pero cualquier cosa
 * que SÍ tenga que sobrevivir a la navegación —el asistente, por ejemplo— va
 * en `App.jsx`, al lado de `<Routes>`, donde se monta una sola vez.
 */
function ModernLayout({ children, title }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { totalItems } = useCart()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { toast, confirm } = useUI()

  const isActive = (path) => (location.pathname === path ? 'active' : '')

  const handleLogout = async () => {
    const confirmado = await confirm({
      titulo: '¿Cerrar sesión?',
      mensaje: 'Vas a tener que iniciar sesión de nuevo para comprar.',
      textoConfirmar: 'Cerrar sesión',
    })

    if (!confirmado) return

    await logout()
    toast.info('Sesión cerrada')
    navigate('/')
  }

  return (
    <div className="modern-layout">
      <header className="modern-header">
        <div className="header-brand-section">
          <img
            src="/images/logo.svg"
            alt="Logo Hermanos Jota"
            className="header-logo-small"
          />
          <p className="modern-title">Mueblería Hermanos JOTA</p>
        </div>

        <nav className="modern-nav" aria-label="Navegación principal">
          <Link to="/" className={`nav-link ${isActive('/')}`}>
            🏠 Inicio
          </Link>
          <Link to="/productos" className={`nav-link ${isActive('/productos')}`}>
            📦 Productos
          </Link>
          <Link to="/contacto" className={`nav-link ${isActive('/contacto')}`}>
            📞 Contacto
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/carrito" className={`nav-link ${isActive('/carrito')}`}>
                🛒 Carrito ({totalItems})
              </Link>
              <Link
                to="/mis-pedidos"
                className={`nav-link ${isActive('/mis-pedidos')}`}
              >
                📦 Mis pedidos
              </Link>
              <Link to="/perfil" className={`nav-link ${isActive('/perfil')}`}>
                👤 {user?.nombre?.split(' ')[0] || 'Mi perfil'}
              </Link>
              {isAdmin && (
                <>
                  <Link
                    to="/admin/pedidos"
                    className={`nav-link ${isActive('/admin/pedidos')}`}
                  >
                    📋 Pedidos
                  </Link>
                  <Link
                    to="/admin/stock"
                    className={`nav-link ${isActive('/admin/stock')}`}
                  >
                    📊 Stock
                  </Link>
                  <Link
                    to="/admin/crear-producto"
                    className={`nav-link ${isActive('/admin/crear-producto')}`}
                  >
                    ➕ Crear producto
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="nav-link nav-button logout-button"
              >
                🚪 Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`nav-link ${isActive('/login')}`}>
                🔐 Iniciar sesión
              </Link>
              <Link to="/registro" className={`nav-link ${isActive('/registro')}`}>
                📝 Registrarse
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>{title && <h1 className="sr-only">{title}</h1>}{children}</main>

      <footer className="modern-footer">
        <p>
          Hermanos Jota • Av. San Juan 2847, CABA • info@hermanosjota.com.ar •
          © 2025
        </p>
      </footer>
    </div>
  )
}

export default ModernLayout
