import { Routes, Route } from 'react-router-dom'
import { UIProvider } from './contexts/UIContext'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Contact from './pages/Contact'
import Cart from './pages/Cart'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import MisPedidos from './pages/MisPedidos'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminPedidos from './pages/admin/AdminPedidos'
import AdminStock from './pages/admin/AdminStock'
import NotFound from './pages/NotFound'
import FormCreateProduct from './components/FormCreateProduct'
import ProtectedRoute from './components/ProtectedRoute'
import AsistenteWidget from './components/AsistenteWidget'

function App() {
  return (
    // UIProvider va más afuera para que cualquier capa pueda mostrar toasts,
    // incluido el propio flujo de autenticación.
    <UIProvider>
      <AuthProvider>
        <CartProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/productos" element={<Products />} />
              <Route path="/productos/:id" element={<ProductDetail />} />
              <Route path="/contacto" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Register />} />

              {/* Recuperación de contraseña: públicas por definición. Quien
                  las usa no puede iniciar sesión, que es justamente el
                  problema que vinieron a resolver. */}
              <Route path="/recuperar-password" element={<ForgotPassword />} />
              <Route path="/restablecer-password" element={<ResetPassword />} />

              {/* Requieren sesión */}
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/carrito"
                element={
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mis-pedidos"
                element={
                  <ProtectedRoute>
                    <MisPedidos />
                  </ProtectedRoute>
                }
              />

              {/* Requieren rol admin. Antes usaba el mismo ProtectedRoute que
                  /perfil, así que cualquier usuario registrado entraba
                  escribiendo la URL a mano. */}
              <Route
                path="/admin/crear-producto"
                element={
                  <ProtectedRoute requireRole="admin">
                    <FormCreateProduct />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pedidos"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminPedidos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/stock"
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminStock />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>

            {/*
              El asistente va ACÁ, hermano de <Routes> y no adentro de
              ModernLayout.

              Estaba dentro del layout, y como cada página renderiza su propio
              <ModernLayout>, al navegar React desmontaba el widget entero y lo
              volvía a montar: la conversación se perdía en cada click del
              menú. Acá afuera queda fuera del árbol de rutas, así que cambiar
              de página no lo desmonta y el historial del chat sobrevive.

              El estado vive en memoria, así que la navegación entre páginas no
              lo toca. Un F5 sí recargaría el módulo, pero el widget persiste la
              conversación en sessionStorage y la rehidrata al montar, así que
              tampoco se pierde con un refresh.
            */}
            <AsistenteWidget />
          </div>
        </CartProvider>
      </AuthProvider>
    </UIProvider>
  )
}

export default App
