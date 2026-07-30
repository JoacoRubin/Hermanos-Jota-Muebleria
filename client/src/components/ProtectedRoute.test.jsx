import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

let sesion = { isAuthenticated: false, user: null }
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => sesion,
}))

function renderRuta(children, props = {}) {
  return render(
    <MemoryRouter initialEntries={['/protegida']}>
      <Routes>
        <Route
          path="/protegida"
          element={<ProtectedRoute {...props}>{children}</ProtectedRoute>}
        />
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  sesion = { isAuthenticated: false, user: null }
})

describe('ProtectedRoute', () => {
  it('manda al login si no hay sesión', () => {
    renderRuta(<p>Contenido privado</p>)

    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument()
  })

  it('deja pasar a un usuario autenticado', () => {
    sesion = { isAuthenticated: true, user: { id: 'u1', role: 'user' } }

    renderRuta(<p>Contenido privado</p>)

    expect(screen.getByText('Contenido privado')).toBeInTheDocument()
  })

  // ── Regresión del bug B7 ────────────────────────────────────────────────
  // El panel de admin usaba el mismo ProtectedRoute que /perfil, que sólo
  // miraba si había sesión: cualquier usuario registrado entraba escribiendo
  // la URL a mano.
  it('bloquea a un usuario común en una ruta que exige admin', () => {
    sesion = { isAuthenticated: true, user: { id: 'u1', role: 'user' } }

    renderRuta(<p>Panel de administración</p>, { requireRole: 'admin' })

    expect(screen.queryByText('Panel de administración')).not.toBeInTheDocument()
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  it('deja pasar a un admin en una ruta que exige admin', () => {
    sesion = { isAuthenticated: true, user: { id: 'a1', role: 'admin' } }

    renderRuta(<p>Panel de administración</p>, { requireRole: 'admin' })

    expect(screen.getByText('Panel de administración')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// `bloquearAdmins`: la puerta que atrapa al admin que escribe /carrito a mano.
//
// Esconder el link del nav no alcanza, la URL sigue existiendo. Y esto tampoco
// es seguridad —de eso se encarga el middleware `bloquearAdmins` sobre
// POST /api/orders—: es no dejarlo entrar a una pantalla que no le sirve.
// ─────────────────────────────────────────────────────────────────────────────

describe('ProtectedRoute con bloquearAdmins', () => {
  it('saca al admin de la pantalla de compra', () => {
    sesion = {
      isAuthenticated: true,
      user: { id: 'a1', role: 'admin' },
      isAdmin: true,
    }

    renderRuta(<p>Carrito</p>, { bloquearAdmins: true })

    expect(screen.queryByText('Carrito')).not.toBeInTheDocument()
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  it('no molesta al cliente', () => {
    sesion = {
      isAuthenticated: true,
      user: { id: 'u1', role: 'user' },
      isAdmin: false,
    }

    renderRuta(<p>Carrito</p>, { bloquearAdmins: true })

    expect(screen.getByText('Carrito')).toBeInTheDocument()
  })

  // Sin sesión gana el login: quien no inició sesión no tiene que ver el
  // mensaje de "las cuentas de administración no compran".
  it('sin sesión sigue mandando al login, no al inicio', () => {
    renderRuta(<p>Carrito</p>, { bloquearAdmins: true })

    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
  })

  // La regla es "los admin no", no "solo los user". Si mañana existe otro rol,
  // no queda afuera del carrito sin que nadie lo haya decidido.
  it('un rol que no es admin pasa igual', () => {
    sesion = {
      isAuthenticated: true,
      user: { id: 'v1', role: 'vendedor' },
      isAdmin: false,
    }

    renderRuta(<p>Carrito</p>, { bloquearAdmins: true })

    expect(screen.getByText('Carrito')).toBeInTheDocument()
  })
})
