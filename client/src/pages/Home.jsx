import { Link, useLocation } from 'react-router-dom'
import ModernLayout from '../components/ModernLayout'

function Home() {
  const location = useLocation()

  return (
    <ModernLayout>
      {/* Mensaje que deja ProtectedRoute cuando alguien intenta entrar a una
          sección para la que no tiene permisos. */}
      {location.state?.message && (
        <div className="content-card">
          <p className="info-message" role="status">
            {location.state.message}
          </p>
        </div>
      )}

      <div className="hero-card">
        <h1 className="hero-title">Bienvenidos a Mueblería Hermanos Jota</h1>
        <p className="hero-description">
          El redescubrimiento de un arte olvidado: crear muebles que no solo
          sirven una función, sino que alimentan el alma. Cada pieza cuenta la
          historia de manos expertas y materiales nobles, donde la calidez del
          optimismo se encuentra con la conciencia de la sustentabilidad.
        </p>
        <Link to="/productos" className="explore-button">
          🏠 Explorar catálogo 🏠
        </Link>
      </div>
    </ModernLayout>
  )
}

export default Home
