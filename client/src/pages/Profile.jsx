import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import ModernLayout from '../components/ModernLayout'

function Profile() {
  const { user, logout } = useAuth()

  if (!user) {
    return null // ProtectedRoute se encargará de redirigir
  }

  return (
    <ModernLayout title="Mi Perfil">
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Mi Perfil</h2>
          
          <div className="profile-info">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {user.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="profile-details">
              <div className="profile-field">
                <label>Nombre Completo</label>
                <p>{user.nombre}</p>
              </div>

              <div className="profile-field">
                <label>Email</label>
                <p>{user.email}</p>
              </div>

              <div className="profile-field">
                <label>Rol</label>
                <p className="badge-role">
                  {user.role === 'admin' ? '👑 Administrador' : '👤 Usuario'}
                </p>
              </div>

              {user.createdAt && (
                <div className="profile-field">
                  <label>Miembro desde</label>
                  <p>{new Date(user.createdAt).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                </div>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <Link to="/productos" className="btn btn-primary">
              Ver Catálogo de Productos
            </Link>
            <Link to="/carrito" className="btn btn-secondary">
              🛒 Ir a Mi Carrito
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin/crear-producto" className="btn btn-accent">
                ➕ Crear Nuevo Producto
              </Link>
            )}
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

export default Profile
