import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Puerta de entrada del lado del cliente.
 *
 * IMPORTANTE, y vale repetirlo: esto NO es seguridad. Es conveniencia —
 * evita que el usuario llegue a una pantalla que igual le va a fallar.
 * Cualquiera puede abrir DevTools y saltearlo. La seguridad real está en el
 * backend, en `requireRole('admin')`. Este componente y ese middleware son
 * dos cosas distintas y hacen falta las dos.
 */
function ProtectedRoute({ children, requireRole }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          message: 'Debés iniciar sesión para acceder a esta página',
        }}
        replace
      />
    )
  }

  if (requireRole && user?.role !== requireRole) {
    return (
      <Navigate
        to="/"
        state={{ message: 'No tenés permisos para acceder a esa sección' }}
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
