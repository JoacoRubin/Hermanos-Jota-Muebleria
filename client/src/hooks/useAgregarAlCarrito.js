import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useUI } from '../contexts/UIContext'

/**
 * "Agregar al carrito", con la decisión de qué hacer si no hay sesión.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * EL BUG QUE RESUELVE
 * ────────────────────────────────────────────────────────────────────────────
 * Un visitante sin cuenta apretaba "Agregar", veía el toast de éxito… y no
 * tenía carrito. Dos cosas fallaban a la vez:
 *
 *  1. `/carrito` está protegido por sesión, así que "Ver carrito" lo mandaba
 *     al login. El toast prometía algo que la app no podía cumplir.
 *  2. El ítem SÍ se guardaba, bajo la clave `cart_guest`. Pero al registrarse
 *     la clave pasa a `cart_<id>`, así que ese carrito quedaba huérfano: el
 *     usuario perdía justo lo que había elegido, en el peor momento posible.
 *
 * Ahora el click sin sesión no simula nada: lleva a crear la cuenta, diciendo
 * por qué y recordando a dónde volver. Prometer menos y cumplirlo.
 *
 * Vive en un hook y no en cada página porque la regla es una sola. Estaba
 * duplicada en `Products` y en `ProductDetail`, que es como se llega a que un
 * día solo una de las dos se actualice.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * EL ADMIN NO COMPRA
 * ────────────────────────────────────────────────────────────────────────────
 * Es el mismo actor que despacha, cancela y repone stock. Si además pudiera
 * pedir, estaría a los dos lados del mostrador: sus compras descontarían stock
 * real y aparecerían en su propio panel para que se las apruebe a sí mismo.
 *
 * Esto es UX, NO seguridad — un `curl` con el token del admin ni pasa por acá.
 * La regla de verdad vive en `bloquearAdmins`, sobre `POST /api/orders`.
 */
export function useAgregarAlCarrito() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isAdmin } = useAuth()
  const { addToCart } = useCart()
  const { toast } = useUI()

  return useCallback(
    (producto) => {
      // Va ANTES del chequeo de sesión: al admin no le falta cuenta, le sobra
      // rol. Mandarlo a `/registro` sería el guion equivocado.
      if (isAdmin) {
        toast.error(
          'Las cuentas de administración no compran. Ingresá con una cuenta de cliente.'
        )
        return
      }

      if (!isAuthenticated) {
        navigate('/registro', {
          state: {
            // `from` es lo que permite devolverlo a la página del producto
            // después de registrarse, en vez de dejarlo en el home buscando
            // de nuevo lo que ya había encontrado.
            from: location,
            message: `Creá tu cuenta para agregar "${producto.nombre}" al carrito.`,
          },
        })
        return
      }

      addToCart(producto)
      toast.success(`${producto.nombre} agregado al carrito`)
    },
    [isAdmin, isAuthenticated, addToCart, toast, navigate, location]
  )
}

export default useAgregarAlCarrito
