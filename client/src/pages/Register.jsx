import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'
import ModernLayout from '../components/ModernLayout'
import PasswordInput from '../components/ui/PasswordInput'

const MIN_PASSWORD = 8

function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()
  const { toast } = useUI()

  // Quien llega desde "Agregar al carrito" viene con el producto que quería y
  // el motivo. Devolverlo al home después de registrarse lo obligaría a buscar
  // de nuevo lo que ya había encontrado.
  const destino = location.state?.from?.pathname || '/'

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (evento) => {
    const { name, value } = evento.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (evento) => {
    evento.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    // Mismo criterio que aplica la API. La validación real es la del
    // servidor; esta solo ahorra un viaje de ida y vuelta.
    if (formData.password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`)
      return
    }

    if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError('La contraseña debe incluir al menos una letra y un número')
      return
    }

    setLoading(true)

    try {
      const { confirmPassword: _descartado, ...userData } = formData
      const usuario = await register(userData)
      toast.success(`¡Bienvenido a Hermanos Jota, ${usuario.nombre.split(' ')[0]}!`)
      navigate(destino, { replace: true })
    } catch (err) {
      setError(err.detalle || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModernLayout title="Crear cuenta">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Crear cuenta</h1>
          <p className="auth-subtitle">Unite a la familia Hermanos Jota</p>

          {/* El motivo por el que lo mandamos acá. Sin esto, el usuario que
              apretó "Agregar al carrito" aparece en un formulario de registro
              sin saber por qué. */}
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
              <label htmlFor="nombre">Nombre completo *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={80}
                placeholder="Juan Pérez"
                autoComplete="name"
              />
            </div>

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
                minLength={MIN_PASSWORD}
                placeholder={`Mínimo ${MIN_PASSWORD} caracteres, con letras y números`}
                autoComplete="new-password"
                aria-describedby="password-ayuda"
              />
              <p id="password-ayuda" className="form-hint">
                Al menos {MIN_PASSWORD} caracteres, incluyendo una letra y un
                número.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña *</label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={MIN_PASSWORD}
                placeholder="Repetí tu contraseña"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full-width"
              disabled={loading}
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              ¿Ya tenés cuenta?{' '}
              {/* Se reenvía el `state`: si vino de "Agregar al carrito" y en
                  realidad ya tenía cuenta, el login tiene que devolverlo al
                  mismo producto. Sin esto, cambiar de pantalla pierde el
                  contexto y termina en el home. */}
              <Link to="/login" state={location.state} className="auth-link">
                Iniciá sesión acá
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

export default Register
