import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import useAgregarAlCarrito from './useAgregarAlCarrito'

// Se controla la sesión desde el test sin montar el flujo real de auth.
let usuarioLogueado = false
let usuarioEsAdmin = false
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: usuarioLogueado,
    isAdmin: usuarioEsAdmin,
  }),
}))

const addToCart = vi.fn()
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({ addToCart }),
}))

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
vi.mock('../contexts/UIContext', () => ({
  useUI: () => ({ toast }),
}))

// `useNavigate` es lo que queremos observar: a dónde manda y con qué contexto.
const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => navigate }
})

const SOFA = {
  id: 'p1',
  nombre: 'Sofá Patagonia',
  precio: 245000,
  disponible: true,
  stockStatus: 'disponible',
  unidadesRestantes: null,
}

function Boton() {
  const agregar = useAgregarAlCarrito()
  return (
    <button type="button" onClick={() => agregar(SOFA)}>
      Agregar
    </button>
  )
}

const renderBoton = () =>
  render(
    <MemoryRouter initialEntries={['/productos/p1']}>
      <Boton />
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
  usuarioLogueado = false
  usuarioEsAdmin = false
})

describe('sin sesión', () => {
  // ── El bug reportado ────────────────────────────────────────────────────
  // Un visitante sin cuenta apretaba "Agregar", veía el toast de éxito y no
  // tenía carrito: /carrito está protegido, y el ítem quedaba en `cart_guest`,
  // una clave que se abandona apenas el usuario se registra.
  it('NO agrega nada al carrito', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addToCart).not.toHaveBeenCalled()
  })

  it('no miente con un toast de éxito', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('manda a crear la cuenta', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(navigate).toHaveBeenCalledWith('/registro', expect.anything())
  })

  it('explica por qué, nombrando el producto', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    const [, opciones] = navigate.mock.calls[0]
    expect(opciones.state.message).toContain('Sofá Patagonia')
  })

  it('recuerda a dónde volver después de registrarse', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    const [, opciones] = navigate.mock.calls[0]
    expect(opciones.state.from.pathname).toBe('/productos/p1')
  })
})

describe('con sesión', () => {
  beforeEach(() => {
    usuarioLogueado = true
  })

  it('agrega el producto y avisa', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addToCart).toHaveBeenCalledWith(SOFA)
    expect(toast.success).toHaveBeenCalled()
  })

  it('no interrumpe la navegación', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('con sesión de administrador', () => {
  beforeEach(() => {
    usuarioLogueado = true
    usuarioEsAdmin = true
  })

  // Quien despacha y cancela no puede además comprar: sus pedidos descontarían
  // stock real y caerían en su propio panel para que se los apruebe a sí mismo.
  it('NO agrega nada al carrito', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addToCart).not.toHaveBeenCalled()
  })

  it('no miente con un toast de éxito', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('explica por qué en vez de fallar en silencio', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(toast.error).toHaveBeenCalled()
  })

  // Al admin no le falta una cuenta: le sobra rol. Mandarlo a /registro sería
  // el guion equivocado.
  it('no lo manda a registrarse', async () => {
    const user = userEvent.setup()
    renderBoton()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(navigate).not.toHaveBeenCalled()
  })
})
