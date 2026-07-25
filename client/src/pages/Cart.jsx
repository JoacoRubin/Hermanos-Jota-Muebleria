import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useUI } from '../contexts/UIContext'
import ModernLayout from '../components/ModernLayout'
import CartItem from '../components/cart/CartItem'
import CheckoutForm from '../components/cart/CheckoutForm'
import OrderService from '../services/orderService'
import { formatearPrecio } from '../constants'

/**
 * Container: coordina estado, servicios y navegación.
 * El detalle visual vive en CartItem y CheckoutForm.
 *
 * La versión anterior eran 280 líneas con estilos inline en cada nodo,
 * lógica de negocio y fetching mezclados en el mismo archivo.
 */
function Cart() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, totalPrecio } =
    useCart()
  const { toast, confirm } = useUI()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [mostrarCheckout, setMostrarCheckout] = useState(false)

  const handleVaciar = async () => {
    const confirmado = await confirm({
      titulo: '¿Vaciar el carrito?',
      mensaje: 'Se van a quitar todos los productos.',
      textoConfirmar: 'Vaciar',
      peligroso: true,
    })

    if (confirmado) {
      clearCart()
      toast.info('Carrito vaciado')
    }
  }

  const handleConfirmarPedido = async ({ direccionEnvio, notas }) => {
    setLoading(true)

    try {
      const pedido = await OrderService.createOrder({
        items: cartItems,
        direccionEnvio,
        notas,
      })

      clearCart()
      setMostrarCheckout(false)
      toast.success(
        `¡Pedido confirmado! Número ${pedido.id.slice(-8).toUpperCase()}`
      )
      navigate('/mis-pedidos')
    } catch (error) {
      // Errores útiles de verdad: si falta stock, el backend dice de qué
      // producto y cuánto queda.
      toast.error(error.detalle || 'No se pudo procesar el pedido')
    } finally {
      setLoading(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <ModernLayout title="Carrito">
        <div className="content-card estado-vacio">
          <div className="estado-vacio__icono" aria-hidden="true">
            🛒
          </div>
          <h1>Tu carrito está vacío</h1>
          <p>Descubrí nuestros muebles artesanales únicos.</p>
          <Link to="/productos" className="explore-button">
            Ver catálogo
          </Link>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout title="Carrito">
      <div className="content-card">
        <div className="cart-header">
          <h1>Carrito de compras</h1>
          <button type="button" className="btn btn-danger" onClick={handleVaciar}>
            Vaciar carrito
          </button>
        </div>

        <ul className="cart-items">
          {cartItems.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onCambiarCantidad={updateQuantity}
              onEliminar={removeFromCart}
            />
          ))}
        </ul>

        <section className="cart-resumen">
          <h2 className="cart-resumen__total">
            Total: {formatearPrecio(totalPrecio)}
          </h2>

          {!mostrarCheckout ? (
            <div className="cart-resumen__acciones">
              <Link to="/productos" className="btn btn-secondary">
                Seguir comprando
              </Link>
              <button
                type="button"
                className="explore-button"
                onClick={() => setMostrarCheckout(true)}
              >
                Finalizar compra
              </button>
            </div>
          ) : (
            <CheckoutForm
              loading={loading}
              onConfirmar={handleConfirmarPedido}
              onCancelar={() => setMostrarCheckout(false)}
            />
          )}
        </section>
      </div>
    </ModernLayout>
  )
}

export default Cart
