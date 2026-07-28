import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { useAuth } from './AuthContext'
import ProductService from '../services/productService'
import { MAX_CANTIDAD_POR_ITEM } from '../constants'

const CartContext = createContext(null)

/**
 * Cuántas unidades como máximo se pueden poner de este producto.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ANTES ESTO ERA `product.stock ?? Infinity`, Y ESE CAMPO YA NO EXISTE.
 * ────────────────────────────────────────────────────────────────────────────
 * Ahora la API pública no devuelve el stock, así que el `??` caía siempre en
 * `Infinity` y el carrito dejaba de topear: se podían cargar 500 sillas.
 *
 * El tope se arma con lo que el servidor sí revela:
 *
 *  - `unidadesRestantes` cuando quedan pocas (≤ umbral). Es el número que el
 *    aviso "Últimas 2 unidades" ya publica, así que usarlo no filtra nada.
 *  - `MAX_CANTIDAD_POR_ITEM` en cualquier otro caso. No sabemos cuántas hay
 *    —ni tenemos por qué— pero sí sabemos que el servidor no acepta más de
 *    100 por ítem, así que ese es el techo honesto.
 *
 * Esto es comodidad de la UI, no una garantía: el stock real lo verifica
 * `POST /api/orders` con un `$inc` condicional y responde 409 si no alcanza.
 *
 * ⚠️ El tope se PERSISTE en localStorage junto al ítem, así que es una foto
 * del stock al momento de agregarlo. Por eso existe `revalidarTopes`: sin eso
 * la foto no vencía nunca. Ver el comentario de esa función.
 */
function topeDe(producto) {
  if (producto?.disponible === false) return 0

  return typeof producto?.unidadesRestantes === 'number'
    ? producto.unidadesRestantes
    : MAX_CANTIDAD_POR_ITEM
}

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

  /**
   * Los ítems actuales, legibles desde un callback estable.
   *
   * `revalidarTopes` no puede depender de `cartItems`: cambiaría de identidad
   * en cada modificación del carrito y el efecto que la dispara se volvería a
   * ejecutar en loop. Se asigna durante el render y no en un efecto a
   * propósito — los efectos de los hijos corren ANTES que los del padre, así
   * que un `useEffect` acá llegaría tarde para la primera revalidación.
   */
  const itemsRef = useRef(estado.items)
  itemsRef.current = estado.items

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
    const tope = topeDe(product)

    setCartItems((prev) => {
      const existente = prev.find((item) => item.id === product.id)

      if (existente) {
        // Nunca se supera el tope conocido.
        const nuevaCantidad = Math.min(existente.cantidad + cantidad, tope)
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, cantidad: nuevaCantidad, tope }
            : item
        )
      }

      return [
        ...prev,
        {
          id: product.id,
          nombre: product.nombre,
          precio: product.precio,
          imagenUrl: product.imagenUrl,
          // Se guarda el tope, no el stock: el ítem del carrito no debe
          // conservar en localStorage un dato que la API decidió no dar.
          tope,
          cantidad: Math.min(cantidad, tope),
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
                // `?? MAX_CANTIDAD_POR_ITEM` cubre los carritos que quedaron
                // guardados en localStorage con el formato viejo (`stock`).
                cantidad: Math.min(
                  nuevaCantidad,
                  item.tope ?? MAX_CANTIDAD_POR_ITEM
                ),
              }
            : item
        )
      )
    },
    [removeFromCart, setCartItems]
  )

  const clearCart = useCallback(() => setCartItems([]), [setCartItems])

  /**
   * Vuelve a preguntarle al servidor cuánto se puede pedir de cada ítem.
   *
   * ──────────────────────────────────────────────────────────────────────────
   * EL BUG QUE RESUELVE
   * ──────────────────────────────────────────────────────────────────────────
   * `addToCart` guarda el `tope` DENTRO del ítem, y el ítem vive en
   * localStorage. Era un dato derivado del servidor, persistido en el cliente,
   * sin fecha de vencimiento: nadie volvía a preguntar nunca.
   *
   * El escenario concreto: un producto queda con 2 unidades, el usuario lo
   * agrega y el carrito anota `tope: 2`. El admin repone 100. El botón "+"
   * seguía deshabilitado. Para siempre. Sobrevivía al F5 y al logout, porque
   * el número estaba guardado en el navegador. Una venta que se pierde en
   * silencio y de la que nadie se entera.
   *
   * Notar la asimetría con el checkout: si el stock BAJA, el 409 de
   * `POST /api/orders` protege al negocio. Si SUBE, no hay nada que avise —
   * el error es solo del lado del cliente, y por eso hay que corregirlo acá.
   *
   * Un producto que ya no responde (404 o red caída) conserva su tope: dejar
   * el carrito como está es preferible a vaciarlo por un problema de conexión.
   *
   * @returns {Promise<{ ajustados: Array<{ nombre, cantidad }>, agotados: Array<{ nombre }> }>}
   *   Lo que cambió, para que la página lo cuente. El contexto ajusta el
   *   estado; los toasts son decisión de quien renderiza.
   */
  const revalidarTopes = useCallback(async () => {
    const actuales = itemsRef.current
    const sinCambios = { ajustados: [], agotados: [] }

    if (actuales.length === 0) return sinCambios

    const consultados = await Promise.all(
      actuales.map(async (item) => {
        try {
          const producto = await ProductService.getById(item.id)
          return { id: item.id, tope: topeDe(producto) }
        } catch {
          return null
        }
      })
    )

    const topes = new Map(
      consultados.filter(Boolean).map(({ id, tope }) => [id, tope])
    )
    if (topes.size === 0) return sinCambios

    const ajustados = []
    const agotados = []

    for (const item of actuales) {
      if (!topes.has(item.id)) continue

      const tope = topes.get(item.id)
      if (tope === 0) agotados.push({ nombre: item.nombre })
      else if (tope < item.cantidad) {
        ajustados.push({ nombre: item.nombre, cantidad: tope })
      }
    }

    setCartItems((prev) =>
      prev
        // Sin stock es sin stock: el ítem se va. Dejarlo en cantidad 0 —que es
        // lo que daría el `Math.min` de abajo— es una fila que no se puede
        // sumar, no se puede restar y no se entiende.
        .filter((item) => topes.get(item.id) !== 0)
        .map((item) => {
          if (!topes.has(item.id)) return item

          const tope = topes.get(item.id)
          if (tope === item.tope) return item

          return { ...item, tope, cantidad: Math.min(item.cantidad, tope) }
        })
    )

    return { ajustados, agotados }
  }, [setCartItems])

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
      revalidarTopes,
      totalItems,
      totalPrecio,
    }
  }, [
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    revalidarTopes,
  ])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartContext
