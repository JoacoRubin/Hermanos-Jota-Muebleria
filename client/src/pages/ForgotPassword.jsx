import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthService from '../services/authService'
import ModernLayout from '../components/ModernLayout'

/**
 * "Olvidé mi contraseña".
 *
 * ⚠️ REGLA QUE NO SE PUEDE ROMPER DESDE ACÁ: la pantalla NUNCA dice si el
 * email existe. El servidor devuelve el mismo mensaje en los dos casos —esa
 * es la defensa contra la enumeración de cuentas— y si el frontend intentara
 * ser "más útil" ("no encontramos ese email"), tiraría abajo la protección
 * entera. Por eso acá solo se muestra lo que vino del servidor.
 */
function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const handleSubmit = async (evento) => {
    evento.preventDefault()
    setError(null)
    setLoading(true)

    try {
      setMensaje(await AuthService.forgotPassword(email.trim()))
    } catch (err) {
      // Lo único que puede fallar visiblemente es el rate limit (429) o la
      // validación del formato del email. Ninguno revela si la cuenta existe.
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }

  if (mensaje) {
    return (
      <ModernLayout title="Recuperar contraseña">
        <div className="auth-container">
          <div className="auth-card">
            <div className="estado-vacio__icono" aria-hidden="true">
              📬
            </div>
            <h1 className="auth-title">Revisá tu correo</h1>
            <p className="auth-subtitle" role="status">
              {mensaje}
            </p>
            <p className="auth-nota">
              El link vence en una hora y se puede usar una sola vez.
            </p>

            <div className="auth-footer">
              <Link to="/login" className="auth-link">
                Volver a iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout title="Recuperar contraseña">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">¿Olvidaste tu contraseña?</h1>
          <p className="auth-subtitle">
            Poné tu email y te mandamos un link para elegir una nueva.
          </p>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(evento) => {
                  setEmail(evento.target.value)
                  if (error) setError(null)
                }}
                required
                placeholder="tu@email.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full-width"
              disabled={loading}
            >
              {loading ? 'Enviando…' : 'Enviarme el link'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              ¿Te acordaste?{' '}
              <Link to="/login" className="auth-link">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

export default ForgotPassword
