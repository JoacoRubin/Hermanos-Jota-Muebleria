import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import OrderService from '../services/orderService'
import ModernLayout from '../components/ModernLayout'

function Cart() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotalPrice } = useCart()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [direccionEnvio, setDireccionEnvio] = useState('')
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      alert('Debes iniciar sesión para finalizar la compra')
      navigate('/login')
      return
    }

    setShowCheckoutForm(true)
  }

  const handleConfirmOrder = async () => {
    if (!direccionEnvio.trim()) {
      alert('Por favor ingresa una dirección de envío')
      return
    }

    setLoading(true)
    try {
      const items = cartItems.map(item => ({
        producto: item._id,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.quantity
      }))

      const orderData = {
        items,
        direccionEnvio: direccionEnvio.trim()
      }

      const response = await OrderService.createOrder(orderData)
      
      clearCart()
      alert(`¡Pedido realizado con éxito! Número de pedido: ${response.pedido._id}`)
      setDireccionEnvio('')
      setShowCheckoutForm(false)
      navigate('/mis-pedidos')
    } catch (error) {
      console.error('Error al crear el pedido:', error)
      alert(error.message || 'Error al procesar el pedido')
    } finally {
      setLoading(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <ModernLayout>
        <div className="content-card">
          <h1>Carrito de Compras</h1>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
            <h2>Tu carrito está vacío</h2>
            <p>Descubre nuestros muebles artesanales únicos</p>
            <Link to="/productos" className="explore-button" style={{ marginTop: '2rem' }}>
              Ver Catálogo
            </Link>
          </div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Carrito de Compras</h1>
          <button 
            onClick={clearCart}
            className="btn"
            style={{ backgroundColor: 'var(--rosa-polvoriento)', border: 'none' }}
          >
            Vaciar Carrito
          </button>
        </div>

        <div className="cart-items">
          {cartItems.map((item) => (
            <div key={item._id} className="cart-item" style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr auto auto auto',
              gap: '1rem',
              alignItems: 'center',
              padding: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              marginBottom: '1rem',
              border: '1px solid rgba(160, 82, 45, 0.1)'
            }}>
              {item.imagenUrl && (
                <img 
                  src={item.imagenUrl} 
                  alt={item.nombre}
                  style={{ 
                    width: '100px', 
                    height: '80px', 
                    objectFit: 'cover', 
                    borderRadius: '8px' 
                  }}
                />
              )}
              
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--siena-tostado)' }}>
                  {item.nombre}
                </h3>
                <p style={{ margin: 0, color: 'var(--texto-secundario)', fontSize: '0.9rem' }}>
                  ${item.precio?.toLocaleString('es-AR')} c/u
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  style={{ 
                    background: 'var(--verde-salvia)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  -
                </button>
                <span style={{ minWidth: '2rem', textAlign: 'center', fontWeight: 'bold' }}>
                  {item.quantity}
                </span>
                <button 
                  onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  style={{ 
                    background: 'var(--verde-salvia)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  +
                </button>
              </div>

              <div style={{ fontWeight: 'bold', color: 'var(--siena-tostado)' }}>
                ${(item.precio * item.quantity).toLocaleString('es-AR')}
              </div>

              <button 
                onClick={() => removeFromCart(item._id)}
                style={{ 
                  background: 'var(--rosa-polvoriento)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  padding: '0.5rem',
                  cursor: 'pointer'
                }}
                title="Eliminar del carrito"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '2rem', 
          backgroundColor: 'rgba(160, 82, 45, 0.1)', 
          borderRadius: '12px',
          border: '1px solid rgba(160, 82, 45, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--siena-tostado)' }}>
              Total: ${getTotalPrice().toLocaleString('es-AR')}
            </h2>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/productos" className="btn" style={{ backgroundColor: 'var(--texto-secundario)' }}>
              Seguir Comprando
            </Link>
            
            {!showCheckoutForm ? (
              <button 
                className="explore-button"
                style={{ border: 'none', cursor: 'pointer' }}
                onClick={handleCheckout}
              >
                Finalizar Compra
              </button>
            ) : null}
          </div>

          {showCheckoutForm && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--siena-tostado)' }}>Información de Envío</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Dirección de Envío *
                </label>
                <textarea
                  value={direccionEnvio}
                  onChange={(e) => setDireccionEnvio(e.target.value)}
                  placeholder="Ingresa tu dirección completa..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid rgba(160, 82, 45, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCheckoutForm(false)
                    setDireccionEnvio('')
                  }}
                  className="btn"
                  style={{ backgroundColor: 'var(--texto-secundario)' }}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmOrder}
                  className="explore-button"
                  style={{ border: 'none', cursor: 'pointer' }}
                  disabled={loading}
                >
                  {loading ? 'Procesando...' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModernLayout>
  )
}

export default Cart