import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider')
  }
  return context
}

const CLAVE_INVITADO = 'cart_guest'

/**
 * La clave usa `user.id`.
 *
 * Antes decía `user._id`, un campo que la API nunca devolvió: la clave
 * quedaba siempre en `cart_undefined`, así que TODOS los usuarios logueados
 * en el mismo navegador compartían el mismo carrito. En una computadora
 * compartida eso es una fuga de datos, no solo un bug feo.
 */
const claveCarrito = (user) => (user ? `cart_${user.id}` : CLAVE_INVITADO)

function leerCarrito(clave) {
  try {
    const guardado = localStorage.getItem(clave)
    const parsed = guardado ? JSON.parse(guardado) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Un carrito corrupto no puede tirar abajo la app entera.
    localStorage.removeItem(clave)
    return []
  }
}

export const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const claveActual = claveCarrito(user)

  /**
   * Los ítems y la clave a la que pertenecen viajan JUNTOS en un mismo estado.
   *
   * Tenerlos separados provocaba dos fallas, las dos detectadas por los tests:
   *
   * 1. Al montar con sesión ya iniciada, el estado inicial se leía con la
   *    clave de invitado y el carrito guardado nunca se recuperaba — y el
   *    efecto de persistencia lo borraba con la lista vacía.
   * 2. Al cambiar de usuario sin desmontar (login/logout), el efecto de
   *    persistencia corría con los ítems del usuario ANTERIOR y la clave del
   *    NUEVO, filtrando un carrito ajeno.
   *
   * Sincronizar durante el render es el patrón que documenta React para
   * ajustar estado cuando cambia una entrada: React vuelve a renderizar en el
   * acto, sin llegar a ejecutar efectos con datos inconsistentes.
   */
  const [estado, setEstado] = useState(() => ({
    clave: claveActual,
    items: leerCarrito(claveActual),
  }))

  if (estado.clave !== claveActual) {
    setEstado({ clave: claveActual, items: leerCarrito(claveActual) })
  }

  const cartItems = estado.items

  const setCartItems = useCallback((actualizar) => {
    setEstado((prev) => ({
      ...prev,
      items:
        typeof actualizar === 'function' ? actualizar(prev.items) : actualizar,
    }))
  }, [])

  useEffect(() => {
    if (estado.items.length > 0) {
      localStorage.setItem(estado.clave, JSON.stringify(estado.items))
    } else {
      localStorage.removeItem(estado.clave)
    }
  }, [estado])

  const addToCart = useCallback((product, cantidad = 1) => {
    setCartItems((prev) => {
      const existente = prev.find((item) => item.id === product.id)

      if (existente) {
        // Nunca se supera el stock disponible.
        const nuevaCantidad = Math.min(
          existente.cantidad + cantidad,
          product.stock ?? Infinity
        )
        return prev.map((item) =>
          item.id === product.id ? { ...item, cantidad: nuevaCantidad } : item
        )
      }

      return [
        ...prev,
        {
          id: product.id,
          nombre: product.nombre,
          precio: product.precio,
          imagenUrl: product.imagenUrl,
          stock: product.stock,
          cantidad: Math.min(cantidad, product.stock ?? Infinity),
        },
      ]
    })
  }, [setCartItems])

  const removeFromCart = useCallback(
    (productId) => {
      setCartItems((prev) => prev.filter((item) => item.id !== productId))
    },
    [setCartItems]
  )

  const updateQuantity = useCallback(
    (productId, nuevaCantidad) => {
      if (nuevaCantidad <= 0) {
        removeFromCart(productId)
        return
      }

      setCartItems((prev) =>
        prev.map((item) =>
          item.id === productId
            ? {
                ...item,
                cantidad: Math.min(nuevaCantidad, item.stock ?? Infinity),
              }
            : item
        )
      )
    },
    [removeFromCart, setCartItems]
  )

  const clearCart = useCallback(() => setCartItems([]), [setCartItems])

  const value = useMemo(() => {
    const totalItems = cartItems.reduce((sum, item) => sum + item.cantidad, 0)
    const totalPrecio = cartItems.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    )

    return {
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrecio,
    }
  }, [cartItems, addToCart, removeFromCart, updateQuantity, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartContext
