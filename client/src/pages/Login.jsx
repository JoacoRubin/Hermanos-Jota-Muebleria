import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'
import ModernLayout from '../components/ModernLayout'
import PasswordInput from '../components/ui/PasswordInput'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { toast } = useUI()

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const destino = location.state?.from?.pathname || '/'

  const handleChange = (evento) => {
    const { name, value } = evento.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (evento) => {
    evento.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const usuario = await login(formData)
      toast.success(`¡Bienvenido de vuelta, ${usuario.nombre.split(' ')[0]}!`)
      navigate(destino, { replace: true })
    } catch (err) {
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModernLayout title="Iniciar sesión">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Iniciar sesión</h1>
          <p className="auth-subtitle">Bienvenido de vuelta a Hermanos Jota</p>

          {location.state?.message && (
            <div className="info-message">{location.state.message}</div>
          )}

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
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña *</label>
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Tu contraseña"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full-width"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              <Link to="/recuperar-password" className="auth-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
            <p>
              ¿No tenés cuenta?{' '}
              {/* Se reenvía el `state` para no perder a dónde había que volver
                  al cambiar entre login y registro. */}
              <Link to="/registro" state={location.state} className="auth-link">
                Registrate acá
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

export default Login
