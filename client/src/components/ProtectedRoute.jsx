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
function ProtectedRoute({ children, requireRole, bloquearAdmins }) {
  const { isAuthenticated, user, isAdmin } = useAuth()
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

  /**
   * Lo inverso a `requireRole`, y por eso es una prop aparte y no
   * `requireRole="user"`: la regla es "los admin no", no "solo los user". El
   * día que exista un tercer rol, `requireRole="user"` lo dejaría afuera del
   * carrito sin que nadie lo haya decidido. Mismo criterio que `bloquearAdmins`
   * en el backend, y a propósito con el mismo nombre.
   *
   * El mensaje también cambia: al admin no le faltan permisos, le sobran.
   */
  if (bloquearAdmins && isAdmin) {
    return (
      <Navigate
        to="/"
        state={{
          message:
            'Las cuentas de administración no compran. Ingresá con una cuenta de cliente.',
        }}
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
