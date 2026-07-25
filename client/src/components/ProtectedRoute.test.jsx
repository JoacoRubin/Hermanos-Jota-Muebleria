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
