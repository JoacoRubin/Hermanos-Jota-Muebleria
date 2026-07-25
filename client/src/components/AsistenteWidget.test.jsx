import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AsistenteWidget from './AsistenteWidget'
import AsistenteService from '../services/chatService'

// El widget no debe depender del backend: mockeamos el servicio.
vi.mock('../services/chatService', () => ({
  default: { preguntar: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AsistenteWidget', () => {
  it('abre el panel y muestra el saludo', async () => {
    const user = userEvent.setup()
    render(<AsistenteWidget />)

    await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))

    expect(screen.getByText(/asistente de Hermanos Jota/i)).toBeInTheDocument()
  })

  it('envía una pregunta y muestra la respuesta del asistente', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Hacemos envíos a todo el país.',
      fuentes: [{ fuente: '02-envios.txt', seccion: '1. ZONAS' }],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))

    await user.type(screen.getByLabelText('Tu pregunta'), '¿Hacen envíos?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('Hacemos envíos a todo el país.')
    ).toBeInTheDocument()
    expect(screen.getByText('¿Hacen envíos?')).toBeInTheDocument()
    expect(AsistenteService.preguntar).toHaveBeenCalledWith('¿Hacen envíos?')
  })

  it('muestra un mensaje de error si el asistente falla', async () => {
    AsistenteService.preguntar.mockRejectedValue({
      detalle: 'El asistente no está disponible.',
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))

    await user.type(screen.getByLabelText('Tu pregunta'), 'hola?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('El asistente no está disponible.')
    ).toBeInTheDocument()
  })

  it('una sugerencia dispara la pregunta', async () => {
    AsistenteService.preguntar.mockResolvedValue({ respuesta: '5 años.', fuentes: [] })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))

    await user.click(
      screen.getByRole('button', { name: '¿Qué garantía tienen los muebles?' })
    )

    expect(AsistenteService.preguntar).toHaveBeenCalledWith(
      '¿Qué garantía tienen los muebles?'
    )
    expect(await screen.findByText('5 años.')).toBeInTheDocument()
  })
})
