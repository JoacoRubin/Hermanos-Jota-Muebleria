import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CartProvider, useCart } from './CartContext'
import { MAX_CANTIDAD_POR_ITEM } from '../constants'

// El carrito depende de la sesión, pero no queremos montar el flujo real de
// autenticación para probarlo: se controla el usuario desde el mock.
let usuarioActual = null
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: usuarioActual }),
}))

// `revalidarTopes` le vuelve a preguntar al servidor por cada ítem. Acá se
// controla qué contesta: es todo el punto de esos tests.
const getById = vi.fn()
vi.mock('../services/productService', () => ({
  default: {
    getById: (...args) => getById(...args),
  },
}))

function Sonda() {
  const cart = useCart()
  // Se expone la API del contexto para poder invocarla desde el test.
  globalThis.__cart = cart

  return (
    <div>
      <span data-testid="total-items">{cart.totalItems}</span>
      <span data-testid="total-precio">{cart.totalPrecio}</span>
      <span data-testid="nombres">
        {cart.cartItems.map((i) => i.nombre).join(',')}
      </span>
    </div>
  )
}

const renderCarrito = () =>
  render(
    <CartProvider>
      <Sonda />
    </CartProvider>
  )

/**
 * La API ya NO devuelve `stock`: manda `stockStatus`, `disponible` y
 * `unidadesRestantes` (este último solo cuando quedan pocas). El carrito topea
 * con eso. Ver `topeDe` en CartContext.
 */
const SOFA = {
  id: 'p1',
  nombre: 'Sofá Patagonia',
  precio: 245000,
  imagenUrl: '/img.png',
  stockStatus: 'ultimas',
  disponible: true,
  unidadesRestantes: 3,
}

/** Producto con stock normal: la API no dice cuántos hay. */
const MESA = {
  id: 'p2',
  nombre: 'Mesa Pampa',
  precio: 180000,
  imagenUrl: '/mesa.png',
  stockStatus: 'disponible',
  disponible: true,
  unidadesRestantes: null,
}

beforeEach(() => {
  usuarioActual = null
  globalThis.__cart = null
  getById.mockReset()
})

describe('CartContext', () => {
  it('agrega un producto y calcula los totales', () => {
    renderCarrito()

    act(() => globalThis.__cart.addToCart(SOFA))

    expect(screen.getByTestId('total-items')).toHaveTextContent('1')
    expect(screen.getByTestId('total-precio')).toHaveTextContent('245000')
  })

  it('suma cantidades cuando el producto ya está en el carrito', () => {
    renderCarrito()

    act(() => globalThis.__cart.addToCart(SOFA))
    act(() => globalThis.__cart.addToCart(SOFA))

    expect(screen.getByTestId('total-items')).toHaveTextContent('2')
  })

  it('nunca deja superar las unidades que el servidor informó', () => {
    renderCarrito()

    act(() => globalThis.__cart.addToCart(SOFA))
    act(() => globalThis.__cart.updateQuantity('p1', 99))

    expect(screen.getByTestId('total-items')).toHaveTextContent('3')
  })

  // ── Regresión del cambio de contrato ────────────────────────────────────
  // Cuando la API dejó de mandar `stock`, el viejo `product.stock ?? Infinity`
  // caía siempre en `Infinity` y el tope desaparecía: se podían cargar 500
  // sillas. Ahora el techo es MAX_CANTIDAD_POR_ITEM.
  it('topea en el máximo por ítem cuando no se conoce el stock', () => {
    renderCarrito()

    act(() => globalThis.__cart.addToCart(MESA))
    act(() => globalThis.__cart.updateQuantity('p2', 9999))

    expect(screen.getByTestId('total-items')).toHaveTextContent(
      String(MAX_CANTIDAD_POR_ITEM)
    )
  })

  it('no agrega nada de un producto agotado', () => {
    renderCarrito()

    act(() =>
      globalThis.__cart.addToCart({
        ...MESA,
        disponible: false,
        stockStatus: 'agotado',
      })
    )

    expect(screen.getByTestId('total-items')).toHaveTextContent('0')
  })

  it('sumar de a uno tampoco supera el tope', () => {
    renderCarrito()

    for (let i = 0; i < 6; i++) {
      act(() => globalThis.__cart.addToCart(SOFA))
    }

    expect(screen.getByTestId('total-items')).toHaveTextContent('3')
  })

  it('elimina el producto si la cantidad baja a cero', () => {
    renderCarrito()

    act(() => globalThis.__cart.addToCart(SOFA))
    act(() => globalThis.__cart.updateQuantity('p1', 0))

    expect(screen.getByTestId('total-items')).toHaveTextContent('0')
  })

  // ── Regresión del bug B3 ────────────────────────────────────────────────
  // La clave usaba `user._id`, un campo que la API nunca devolvió, así que
  // quedaba en `cart_undefined` para TODOS los usuarios logueados: en una
  // computadora compartida, el siguiente usuario veía el carrito del anterior.
  it('guarda el carrito bajo una clave propia de cada usuario', () => {
    usuarioActual = { id: 'u1', nombre: 'Ana' }
    renderCarrito()

    act(() => globalThis.__cart.addToCart(SOFA))

    expect(localStorage.getItem('cart_u1')).toContain('Sofá Patagonia')
    expect(localStorage.getItem('cart_undefined')).toBeNull()
  })

  it('no filtra el carrito de un usuario al siguiente', () => {
    // Ana carga su carrito…
    usuarioActual = { id: 'ana' }
    const { unmount } = renderCarrito()
    act(() => globalThis.__cart.addToCart(SOFA))
    expect(screen.getByTestId('total-items')).toHaveTextContent('1')
    unmount()

    // …y en la misma máquina entra Bruno.
    usuarioActual = { id: 'bruno' }
    renderCarrito()

    expect(screen.getByTestId('total-items')).toHaveTextContent('0')
    expect(screen.getByTestId('nombres')).toHaveTextContent('')
  })

  it('recupera el carrito guardado del usuario que vuelve', () => {
    usuarioActual = { id: 'ana' }
    const primera = renderCarrito()
    act(() => globalThis.__cart.addToCart(SOFA))
    primera.unmount()

    renderCarrito()

    expect(screen.getByTestId('nombres')).toHaveTextContent('Sofá Patagonia')
  })

  // Cambio de usuario SIN desmontar el provider: es lo que pasa al iniciar o
  // cerrar sesión con la app abierta. Antes, el efecto de persistencia corría
  // con los ítems del usuario anterior y la clave del nuevo.
  it('no filtra el carrito cuando la sesión cambia en vivo', () => {
    usuarioActual = { id: 'ana' }
    const { rerender } = renderCarrito()
    act(() => globalThis.__cart.addToCart(SOFA))

    usuarioActual = { id: 'bruno' }
    rerender(
      <CartProvider>
        <Sonda />
      </CartProvider>
    )

    expect(screen.getByTestId('total-items')).toHaveTextContent('0')
    expect(localStorage.getItem('cart_bruno')).toBeNull()
    expect(localStorage.getItem('cart_ana')).toContain('Sofá Patagonia')
  })

  it('sobrevive a un carrito corrupto en localStorage', () => {
    localStorage.setItem('cart_guest', '{ esto no es JSON')

    renderCarrito()

    expect(screen.getByTestId('total-items')).toHaveTextContent('0')
  })

  it('vaciar el carrito borra también la entrada de localStorage', () => {
    usuarioActual = { id: 'u1' }
    renderCarrito()

    act(() => globalThis.__cart.addToCart(SOFA))
    act(() => globalThis.__cart.clearCart())

    expect(localStorage.getItem('cart_u1')).toBeNull()
  })

  // ── Regresión: el tope era una foto que no vencía nunca ──────────────────
  //
  // `addToCart` guarda el `tope` DENTRO del ítem, y el ítem vive en
  // localStorage. Si el admin reponía stock, ese número quedaba viejo para
  // siempre: sobrevivía al F5 y al logout, y el "+" seguía bloqueado.
  describe('revalidarTopes', () => {
    it('sube el tope cuando el admin repuso stock', async () => {
      renderCarrito()

      // Quedaban 3: el carrito anota tope 3 y no deja pasar de ahí.
      act(() => globalThis.__cart.addToCart(SOFA))
      act(() => globalThis.__cart.updateQuantity('p1', 10))
      expect(screen.getByTestId('total-items')).toHaveTextContent('3')

      // El admin repone: el producto ya no está en zona de escasez.
      getById.mockResolvedValue({
        ...SOFA,
        stockStatus: 'disponible',
        unidadesRestantes: null,
      })

      await act(async () => {
        await globalThis.__cart.revalidarTopes()
      })

      act(() => globalThis.__cart.updateQuantity('p1', 10))
      expect(screen.getByTestId('total-items')).toHaveTextContent('10')
    })

    it('recorta la cantidad cuando quedan menos unidades que las pedidas', async () => {
      renderCarrito()

      act(() => globalThis.__cart.addToCart(SOFA))
      act(() => globalThis.__cart.updateQuantity('p1', 3))

      getById.mockResolvedValue({ ...SOFA, unidadesRestantes: 1 })

      let resultado
      await act(async () => {
        resultado = await globalThis.__cart.revalidarTopes()
      })

      expect(screen.getByTestId('total-items')).toHaveTextContent('1')
      expect(resultado.ajustados).toEqual([
        { nombre: 'Sofá Patagonia', cantidad: 1 },
      ])
    })

    it('saca del carrito lo que se quedó sin stock', async () => {
      renderCarrito()

      act(() => globalThis.__cart.addToCart(SOFA))
      act(() => globalThis.__cart.addToCart(MESA))

      getById.mockImplementation((id) =>
        Promise.resolve(
          id === 'p1' ? { ...SOFA, disponible: false, unidadesRestantes: 0 } : MESA
        )
      )

      let resultado
      await act(async () => {
        resultado = await globalThis.__cart.revalidarTopes()
      })

      expect(screen.getByTestId('nombres')).toHaveTextContent('Mesa Pampa')
      expect(screen.getByTestId('nombres')).not.toHaveTextContent('Sofá')
      expect(resultado.agotados).toEqual([{ nombre: 'Sofá Patagonia' }])
    })

    // Un fallo de red no puede vaciar el carrito de nadie: el error es del
    // lado del cliente y el carrito es lo único que el usuario ya eligió.
    it('un producto que no responde conserva su tope', async () => {
      renderCarrito()

      act(() => globalThis.__cart.addToCart(SOFA))
      act(() => globalThis.__cart.updateQuantity('p1', 3))

      getById.mockRejectedValue(new Error('Network down'))

      let resultado
      await act(async () => {
        resultado = await globalThis.__cart.revalidarTopes()
      })

      expect(screen.getByTestId('total-items')).toHaveTextContent('3')
      expect(resultado).toEqual({ ajustados: [], agotados: [] })
    })

    it('con el carrito vacío no le pregunta nada al servidor', async () => {
      renderCarrito()

      await act(async () => {
        await globalThis.__cart.revalidarTopes()
      })

      expect(getById).not.toHaveBeenCalled()
    })
  })
})
