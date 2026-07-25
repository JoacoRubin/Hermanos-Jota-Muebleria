import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import AuthService from '../services/authService'
import { setSessionExpiredHandler } from '../services/apiClient'

const AuthContext = createContext(null)

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

  // Al montar se intenta recuperar la sesión con la cookie de refresh.
  // El access token vive en memoria, así que un F5 siempre lo pierde:
  // esto es lo que hace que el usuario no tenga que loguearse de nuevo.
  useEffect(() => {
    let cancelado = false

    AuthService.restoreSession()
      .then((usuario) => {
        if (!cancelado) setUser(usuario)
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  // Si el refresh falla en cualquier petición, el cliente HTTP avisa acá
  // y la UI se entera de que la sesión terminó.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    return () => setSessionExpiredHandler(() => {})
  }, [])

  const register = useCallback(async (userData) => {
    const usuario = await AuthService.register(userData)
    setUser(usuario)
    return usuario
  }, [])

  const login = useCallback(async (credentials) => {
    const usuario = await AuthService.login(credentials)
    setUser(usuario)
    return usuario
  }, [])

  const logout = useCallback(async () => {
    await AuthService.logout()
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const usuario = await AuthService.getProfile()
    setUser(usuario)
    return usuario
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      register,
      login,
      logout,
      refreshProfile,
      // Booleanos, NO funciones. `isAuthenticated` era una función y en
      // Cart.jsx se evaluaba como `if (!isAuthenticated)`: una referencia a
      // función siempre es truthy, así que la validación nunca corría.
      // Con un booleano ese bug no se puede escribir.
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
    }),
    [user, loading, register, login, logout, refreshProfile]
  )

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="app-loading" role="status" aria-live="polite">
          Cargando…
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export default AuthContext
