import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const [cartItems, setCartItems] = useState([])

  // Generar clave única para el carrito del usuario
  const getCartKey = () => {
    return user ? `cart_${user._id}` : 'cart_guest'
  }

  // Cargar carrito desde localStorage al montar o cuando cambia el usuario
  useEffect(() => {
    const cartKey = getCartKey()
    const savedCart = localStorage.getItem(cartKey)
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        setCartItems(parsedCart)
      } catch (error) {
        console.error('Error al cargar el carrito:', error)
        setCartItems([])
      }
    } else {
      setCartItems([])
    }
  }, [user])

  // Guardar carrito en localStorage cada vez que cambia
  useEffect(() => {
    const cartKey = getCartKey()
    if (cartItems.length > 0) {
      localStorage.setItem(cartKey, JSON.stringify(cartItems))
    } else {
      localStorage.removeItem(cartKey)
    }
  }, [cartItems, user])

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item._id === product._id)
      
      if (existingItem) {
        return prevItems.map(item =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prevItems, { ...product, quantity: 1 }]
      }
    })
  }

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item._id !== productId))
  }

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item._id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.precio * item.quantity), 0)
  }

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export default CartContext