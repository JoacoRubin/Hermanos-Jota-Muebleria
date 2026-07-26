import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import AuthService from '../services/authService'
import ModernLayout from '../components/ModernLayout'
import { useUI } from '../contexts/UIContext'

/**
 * Pantalla del link del mail: define la contraseña nueva.
 *
 * El token llega en la query string —no hay otra forma de mandarlo en un
 * link— pero de acá sale en el BODY de un POST. Nunca se reenvía por URL: una
 * URL con el token queda en el historial del navegador, en los logs de acceso
 * y en el header `Referer` de cualquier recurso externo que cargue la página.
 */
function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useUI()

  const token = searchParams.get('token') || ''

  const [formData, setFormData] = useState({ password: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (evento) => {
    const { name, value } = evento.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (evento) => {
    evento.preventDefault()

    // La confirmación se valida solo acá: es una ayuda contra el typo, no una
    // regla de negocio. Al servidor le llega una sola contraseña.
    if (formData.password !== formData.confirmar) {
      setError('Las dos contraseñas tienen que ser iguales.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      await AuthService.resetPassword({ token, password: formData.password })

      toast.success('Contraseña actualizada. Entrá con la nueva.')
      navigate('/login', {
        replace: true,
        state: {
          message:
            'Tu contraseña se cambió. Por seguridad cerramos todas las sesiones.',
        },
      })
    } catch (err) {
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Alguien entró a la URL sin token, o el mail se cortó al copiarlo.
  if (!token) {
    return (
      <ModernLayout title="Restablecer contraseña">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Link inválido</h1>
            <p className="auth-subtitle">
              Este link está incompleto. Copialo entero desde el mail o pedí
              uno nuevo.
            </p>
            <Link to="/recuperar-password" className="btn btn-primary btn-full-width">
              Pedir un link nuevo
            </Link>
          </div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout title="Restablecer contraseña">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Elegí una contraseña nueva</h1>
          <p className="auth-subtitle">
            Al menos 8 caracteres, con una letra y un número.
          </p>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">Contraseña nueva *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                maxLength={128}
                placeholder="Tu contraseña nueva"
                autoComplete="new-password"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmar">Repetila *</label>
              <input
                type="password"
                id="confirmar"
                name="confirmar"
                value={formData.confirmar}
                onChange={handleChange}
                required
                minLength={8}
                maxLength={128}
                placeholder="La misma de arriba"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full-width"
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              ¿El link venció?{' '}
              <Link to="/recuperar-password" className="auth-link">
                Pedí uno nuevo
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

export default ResetPassword
