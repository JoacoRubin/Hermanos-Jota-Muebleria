import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './contexts/CartContext'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Contact from './pages/Contact'
import Cart from './pages/Cart'

function App() {
  return (
    <CartProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/productos/:id" element={<ProductDetail />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/carrito" element={<Cart />} />
        </Routes>
      </div>
    </CartProvider>
  )
}

export default App