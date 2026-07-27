import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as renderRTL, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import AsistenteWidget from './AsistenteWidget'
import AsistenteService from '../services/chatService'

vi.mock('../services/chatService', () => ({
  default: { preguntar: vi.fn() },
}))

const render = (ui) => renderRTL(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
})

const abrir = async (user) =>
  user.click(screen.getByRole('button', { name: 'Abrir asistente' }))

describe('accesibilidad del asistente', () => {
  it('el transcript es una región viva, o el lector no anuncia las respuestas', async () => {
    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await abrir(user)

    const log = screen.getByRole('log')

    expect(log).toHaveAttribute('aria-live', 'polite')
    // `atomic=false` hace que se anuncie solo el mensaje nuevo y no toda la
    // conversación de vuelta en cada respuesta.
    expect(log).toHaveAttribute('aria-atomic', 'false')
  })

  it('la respuesta del bot cae dentro de la región viva', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Hacemos envíos a todo el país.',
      fuentes: [],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await abrir(user)
    await user.type(screen.getByLabelText('Tu pregunta'), '¿Hacen envíos?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    const texto = await screen.findByText('Hacemos envíos a todo el país.')
    expect(screen.getByRole('log')).toContainElement(texto)
  })

  it('al abrir, el foco va al campo de texto', async () => {
    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await abrir(user)

    expect(screen.getByLabelText('Tu pregunta')).toHaveFocus()
  })

  it('Escape cierra el panel', async () => {
    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await abrir(user)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reabrir conserva la conversación', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Cinco años de garantía.',
      fuentes: [],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await abrir(user)
    await user.type(screen.getByLabelText('Tu pregunta'), '¿garantía?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Cinco años de garantía.')

    await user.keyboard('{Escape}')
    await abrir(user)

    expect(screen.getByText('Cinco años de garantía.')).toBeInTheDocument()
  })
})

describe('las tarjetas muestran los datos rehidratados por el servidor', () => {
  it('usa el aviso de escasez que calculó el backend', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Queda poco de este.',
      fuentes: [],
      productos: [
        {
          id: 'a'.repeat(24),
          nombre: 'Butaca Mendoza',
          precio: 180000,
          disponible: true,
          stockStatus: 'ultimas',
          lowStockMessage: 'Últimas 2 unidades',
        },
      ],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await abrir(user)
    await user.type(screen.getByLabelText('Tu pregunta'), 'butacas')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('Queda poco de este.')
    expect(screen.getByText('Últimas 2 unidades')).toBeInTheDocument()
  })

  it('un producto con stock normal no muestra ningún aviso', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Mirá este.',
      fuentes: [],
      productos: [
        {
          id: 'b'.repeat(24),
          nombre: 'Mesa Pampa',
          precio: 250000,
          disponible: true,
          stockStatus: 'disponible',
          lowStockMessage: null,
        },
      ],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await abrir(user)
    await user.type(screen.getByLabelText('Tu pregunta'), 'mesas')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('Mirá este.')
    expect(screen.getByText('Mesa Pampa')).toBeInTheDocument()
    // El cliente no se entera de cuántas unidades hay. Ni acá ni en el catálogo.
    expect(screen.queryByText(/unidades?/i)).not.toBeInTheDocument()
  })
})
