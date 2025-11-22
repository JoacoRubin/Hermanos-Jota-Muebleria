import { createContext, useContext, useState, useEffect } from 'react'
import AuthService from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Verificar si hay un usuario autenticado al cargar la app
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = AuthService.getToken()
        if (token) {
          const isValid = await AuthService.verifyToken()
          if (isValid) {
            const userData = AuthService.getUser()
            setUser(userData)
          }
        }
      } catch (error) {
        console.error('Error al inicializar autenticación:', error)
        AuthService.logout()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  // Función de registro
  const register = async (userData) => {
    try {
      setError(null)
      const response = await AuthService.register(userData)
      setUser(response.user)
      return response
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Función de login
  const login = async (credentials) => {
    try {
      setError(null)
      const response = await AuthService.login(credentials)
      setUser(response.user)
      return response
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Función de logout
  const logout = () => {
    AuthService.logout()
    setUser(null)
    setError(null)
  }

  // Actualizar perfil
  const updateProfile = async () => {
    try {
      const response = await AuthService.getProfile()
      setUser(response.user)
      return response
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      throw error
    }
  }

  // Verificar si el usuario está autenticado
  const isAuthenticated = () => {
    return !!user && AuthService.isAuthenticated()
  }

  // Verificar si el usuario es admin
  const isAdmin = () => {
    return user?.role === 'admin'
  }

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    isAuthenticated,
    isAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export default AuthContext
