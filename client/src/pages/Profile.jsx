import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ModernLayout from '../components/ModernLayout'
import { formatearFecha } from '../constants'

function Profile() {
  const { user, isAdmin } = useAuth()

  // ProtectedRoute ya garantiza que hay sesión; esto es solo defensa.
  if (!user) return null

  return (
    <ModernLayout title="Mi perfil">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Mi perfil</h1>

          <div className="profile-info">
            <div className="profile-avatar">
              <div className="avatar-circle" aria-hidden="true">
                {user.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>

            <dl className="profile-details">
              <div className="profile-field">
                <dt>Nombre completo</dt>
                <dd>{user.nombre}</dd>
              </div>

              <div className="profile-field">
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>

              <div className="profile-field">
                <dt>Rol</dt>
                <dd className="badge-role">
                  {isAdmin ? '👑 Administrador' : '👤 Usuario'}
                </dd>
              </div>

              {user.createdAt && (
                <div className="profile-field">
                  <dt>Miembro desde</dt>
                  <dd>{formatearFecha(user.createdAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="profile-actions">
            <Link to="/productos" className="btn btn-primary">
              Ver catálogo
            </Link>
            <Link to="/mis-pedidos" className="btn btn-secondary">
              📦 Mis pedidos
            </Link>
            <Link to="/carrito" className="btn btn-secondary">
              🛒 Mi carrito
            </Link>
            {isAdmin && (
              <Link to="/admin/crear-producto" className="btn btn-accent">
                ➕ Crear producto
              </Link>
            )}
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

export default Profile
