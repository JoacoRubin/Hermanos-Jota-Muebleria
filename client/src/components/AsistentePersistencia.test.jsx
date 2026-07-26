import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import AsistenteWidget from './AsistenteWidget'
import AsistenteService from '../services/chatService'

vi.mock('../services/chatService', () => ({
  default: { preguntar: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * Réplica mínima de la estructura de App.jsx.
 *
 * Lo único que importa acá es DÓNDE está el widget: hermano de `<Routes>`, no
 * adentro. Si alguien lo vuelve a meter dentro de una página —o dentro de un
 * layout que cada página renderiza por su cuenta, que es de donde vino este
 * bug—, estos tests fallan.
 */
function AppDePrueba() {
  return (
    <MemoryRouter initialEntries={['/productos']}>
      <div className="App">
        <Routes>
          <Route
            path="/productos"
            element={
              <div>
                <h1>Productos</h1>
                <Link to="/">Ir a inicio</Link>
              </div>
            }
          />
          <Route
            path="/"
            element={
              <div>
                <h1>Inicio</h1>
                <Link to="/productos">Ir a productos</Link>
              </div>
            }
          />
        </Routes>

        <AsistenteWidget />
      </div>
    </MemoryRouter>
  )
}

describe('el asistente sobrevive a la navegación', () => {
  it('mantiene el panel abierto al cambiar de página', async () => {
    const user = userEvent.setup()
    render(<AppDePrueba />)

    await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Ir a inicio' }))

    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(
      screen.getByRole('dialog'),
      'el panel no debería cerrarse al navegar'
    ).toBeInTheDocument()
  })

  it('conserva la conversación al ir de Productos a Inicio y volver', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Hacemos envíos a todo el país.',
      fuentes: [],
    })

    const user = userEvent.setup()
    render(<AppDePrueba />)

    await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))
    await user.type(screen.getByLabelText('Tu pregunta'), '¿Hacen envíos?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Hacemos envíos a todo el país.')

    // Productos → Inicio → Productos, que es el recorrido del reporte.
    await user.click(screen.getByRole('link', { name: 'Ir a inicio' }))
    await user.click(screen.getByRole('link', { name: 'Ir a productos' }))

    expect(screen.getByText('¿Hacen envíos?')).toBeInTheDocument()
    expect(
      screen.getByText('Hacemos envíos a todo el país.'),
      'la respuesta del bot tiene que seguir ahí después de navegar'
    ).toBeInTheDocument()
  })

  it('no vuelve a mostrar las sugerencias iniciales después de navegar', async () => {
    // Las sugerencias fijas solo aparecen con `mensajes.length === 1`, o sea
    // cuando la conversación está en cero. Si reaparecen, el estado se reseteó.
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: '5 años de garantía.',
      fuentes: [],
    })

    const user = userEvent.setup()
    render(<AppDePrueba />)

    await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))
    await user.click(
      screen.getByRole('button', { name: '¿Qué garantía tienen los muebles?' })
    )
    await screen.findByText('5 años de garantía.')

    await user.click(screen.getByRole('link', { name: 'Ir a inicio' }))

    expect(
      screen.queryByRole('button', { name: '¿Hacen envíos al interior?' }),
      'las sugerencias iniciales de vuelta significan que el chat se reinició'
    ).not.toBeInTheDocument()
  })

  it('el asistente está disponible en todas las páginas', async () => {
    const user = userEvent.setup()
    render(<AppDePrueba />)

    expect(
      screen.getByRole('button', { name: 'Abrir asistente' })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Ir a inicio' }))

    expect(
      screen.getByRole('button', { name: 'Abrir asistente' })
    ).toBeInTheDocument()
  })
})
