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
import NotFound from './pages/NotFound'
import FormCreateProduct from './components/FormCreateProduct'
import ProtectedRoute from './components/ProtectedRoute'

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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </CartProvider>
      </AuthProvider>
    </UIProvider>
  )
}

export default App
