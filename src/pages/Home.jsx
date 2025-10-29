import { Link } from 'react-router-dom'
import ModernLayout from '../components/ModernLayout'

function Home() {
  return (
    <ModernLayout>
      {/* Hero Card */}
      <div className="hero-card">
        <h2 className="hero-title">Bienvenidos a Mueblería Hermanos Jota</h2>
        <p className="hero-description">
          El redescubrimiento de un arte olvidado: crear muebles que no solo sirven una función, 
          sino que alimentan el alma. Cada pieza cuenta la historia de manos expertas y materiales nobles, 
          donde la calidez del optimismo se encuentra con la conciencia de la sustentabilidad.
        </p>
        <Link to="/productos" className="explore-button">
          🏠 Explorar Catálogo 🏠
        </Link>
      </div>
    </ModernLayout>
  )
}

export default Home