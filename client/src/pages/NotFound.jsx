import { Link } from 'react-router-dom'
import ModernLayout from '../components/ModernLayout'

function NotFound() {
  return (
    <ModernLayout>
      <div className="content-card estado-vacio">
        <div className="estado-vacio__icono" aria-hidden="true">
          🧭
        </div>
        <h1>Página no encontrada</h1>
        <p>La dirección a la que quisiste entrar no existe.</p>
        <Link to="/" className="explore-button">
          Volver al inicio
        </Link>
      </div>
    </ModernLayout>
  )
}

export default NotFound
