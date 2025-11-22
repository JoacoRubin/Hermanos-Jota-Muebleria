import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated()) {
    // Redirigir a login y guardar la ruta a la que intentaban acceder
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          message: 'Debes iniciar sesión para acceder a esta página'
        }} 
        replace 
      />
    )
  }

  return children
}

export default ProtectedRoute
