import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'active' : ''
  }

  return (
    <nav className="nav">
      <div className="container">
        <div className="nav-content">
          <div className="nav-brand">
            <Link to="/" className="logo-link">
              <img 
                src="/images/logo.svg" 
                alt="Logo Hermanos Jota" 
                className="logo"
                onError={(e) => {
                  // Fallback al logo placeholder si no se encuentra la imagen principal
                  e.target.src = '/images/logo-placeholder.svg'
                }}
              />
              <span className="brand-name">HERMANOS JOTA</span>
            </Link>
          </div>
          <ul className="nav-menu">
            <li>
              <Link to="/" className={isActive('/')}>
                Inicio
              </Link>
            </li>
          <li>
            <Link to="/productos" className={isActive('/productos')}>
              Catálogo
            </Link>
          </li>
          <li>
            <Link to="/contacto" className={isActive('/contacto')}>
              Contacto
            </Link>
          </li>
        </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar