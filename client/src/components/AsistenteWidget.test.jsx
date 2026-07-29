import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as renderRTL, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import AsistenteWidget from './AsistenteWidget'
import AsistenteService from '../services/chatService'
import { formatearPrecio } from '../constants'

// El widget no debe depender del backend: mockeamos el servicio.
vi.mock('../services/chatService', () => ({
  default: { preguntar: vi.fn() },
}))

/**
 * Las tarjetas de producto usan `<Link>`, que necesita contexto de router.
 * Antes eran `<a href>` y por eso el widget se podía renderizar suelto.
 */
const render = (ui) => renderRTL(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AsistenteWidget', () => {
  it('abre el panel y muestra el saludo', async () => {
    const user = userEvent.setup()
    render(<AsistenteWidget />)

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))

    expect(screen.getByText(/asistente de Hermanos Jota/i)).toBeInTheDocument()
  })

  it('envía una pregunta y muestra la respuesta del asistente', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Hacemos envíos a todo el país.',
      fuentes: [{ fuente: '02-envios.txt', seccion: '1. ZONAS' }],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))

    await user.type(screen.getByLabelText('Tu pregunta'), '¿Hacen envíos?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('Hacemos envíos a todo el país.')
    ).toBeInTheDocument()
    expect(screen.getByText('¿Hacen envíos?')).toBeInTheDocument()
    expect(AsistenteService.preguntar).toHaveBeenCalledWith('¿Hacen envíos?')
  })

  // Las fuentes SIGUEN viajando en la respuesta del RAG (trazabilidad interna,
  // útil para debug), pero por pedido explícito el widget ya NO las muestra:
  // el usuario final solo quiere la respuesta, sin nombres de archivo.
  it('NO muestra las fuentes, aunque la respuesta las incluya', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Hacemos envíos a todo el país.',
      fuentes: [
        { fuente: '02-envios.txt', seccion: '1. ZONAS' },
        { fuente: '03-garantia.txt', seccion: '1. COBERTURA' },
      ],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), '¿Hacen envíos?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('Hacemos envíos a todo el país.')

    expect(screen.queryByText(/^Fuente:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/02-envios\.txt/)).not.toBeInTheDocument()
  })

  it('muestra un mensaje de error si el asistente falla', async () => {
    AsistenteService.preguntar.mockRejectedValue({
      detalle: 'El asistente no está disponible.',
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))

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
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))

    await user.click(
      screen.getByRole('button', { name: '¿Qué garantía tienen los muebles?' })
    )

    expect(AsistenteService.preguntar).toHaveBeenCalledWith(
      '¿Qué garantía tienen los muebles?'
    )
    expect(await screen.findByText('5 años.')).toBeInTheDocument()
  })

  it('muestra las sugerencias que devuelve el RAG después de responder', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Hacemos envíos a todo el país.',
      fuentes: [],
      sugerencias: ['¿Cuánto cuesta el envío?', '¿Incluye armado?'],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), '¿Hacen envíos?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('Hacemos envíos a todo el país.')
    expect(
      screen.getByRole('button', { name: '¿Cuánto cuesta el envío?' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '¿Incluye armado?' })).toBeInTheDocument()
  })

  it('clickear una sugerencia del RAG dispara esa pregunta', async () => {
    AsistenteService.preguntar
      .mockResolvedValueOnce({
        respuesta: 'Hacemos envíos a todo el país.',
        fuentes: [],
        sugerencias: ['¿Cuánto cuesta el envío?'],
      })
      .mockResolvedValueOnce({ respuesta: 'Depende de la provincia.', fuentes: [] })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), '¿Hacen envíos?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Hacemos envíos a todo el país.')

    await user.click(screen.getByRole('button', { name: '¿Cuánto cuesta el envío?' }))

    expect(AsistenteService.preguntar).toHaveBeenLastCalledWith('¿Cuánto cuesta el envío?')
    expect(await screen.findByText('Depende de la provincia.')).toBeInTheDocument()
  })

  it('las sugerencias del mensaje anterior desaparecen al llegar una respuesta nueva', async () => {
    AsistenteService.preguntar
      .mockResolvedValueOnce({
        respuesta: 'Primera respuesta.',
        fuentes: [],
        sugerencias: ['Sugerencia vieja'],
      })
      .mockResolvedValueOnce({ respuesta: 'Segunda respuesta.', fuentes: [], sugerencias: [] })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), 'primera')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Primera respuesta.')
    expect(screen.getByRole('button', { name: 'Sugerencia vieja' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Tu pregunta'), 'segunda')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Segunda respuesta.')

    expect(screen.queryByRole('button', { name: 'Sugerencia vieja' })).not.toBeInTheDocument()
  })

  it('muestra tarjetas de producto cuando el RAG recomienda algo', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'El más caro es el Sillón Copacabana.',
      fuentes: [],
      productos: [
        { id: '1', nombre: 'Sillón Copacabana', precio: 320000, disponible: true, imagenUrl: '/x.png' },
      ],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), '¿el más caro?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('El más caro es el Sillón Copacabana.')
    expect(screen.getByText('Sillón Copacabana')).toBeInTheDocument()

    // Se compara contra el formateador compartido en vez de hardcodear
    // "$320.000": lo que importa es que el asistente formatee IGUAL que el
    // resto de la app, no cuál es el resultado exacto.
    //
    // El `.replace` no es opcional: `Intl` separa el signo del número con un
    // espacio DURO (U+00A0), y Testing Library normaliza el texto del DOM pero
    // NO el string del matcher. Sin esto, los dos valores se ven idénticos en
    // el mensaje de error y no matchean nunca.
    const precioEsperado = formatearPrecio(320000).replace(/\s/g, ' ')
    expect(screen.getByText(precioEsperado)).toBeInTheDocument()
  })

  // ── Regresión: el click que recargaba la aplicación entera ──────────────
  // La tarjeta usaba `<a href>`, o sea navegación de página completa: se
  // perdía la conversación Y el access token, que vive en memoria. Tiene que
  // ser un `<Link>` de react-router, que navega sin recargar.
  it('la tarjeta de producto navega sin recargar la página', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Mirá este.',
      fuentes: [],
      productos: [
        { id: 'abc123', nombre: 'Sillón Copacabana', precio: 320000, disponible: true },
      ],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), 'recomendame algo')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('Mirá este.')

    const enlace = screen.getByRole('link', { name: /Sillón Copacabana/ })
    expect(enlace).toHaveAttribute('href', '/productos/abc123')

    // Un `<Link>` intercepta el click y llama a preventDefault; un `<a href>`
    // pelado no. Es la diferencia observable entre navegar y recargar.
    // Va en `act` porque el click hace navegar al router, y eso es un cambio
    // de estado de React.
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
    act(() => {
      enlace.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
  })

  // `lowStockMessage` lo calcula el servidor (mismo serializer que el
  // catálogo), así que el fixture tiene que traerlo como lo trae la API real.
  it('marca "Sin stock" en un producto recomendado sin stock', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Te recomendaría el Sofá Patagonia.',
      fuentes: [],
      productos: [
        {
          id: '2',
          nombre: 'Sofá Patagonia',
          precio: 245000,
          disponible: false,
          stockStatus: 'agotado',
          lowStockMessage: 'Sin stock',
        },
      ],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), 'algo grande')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('Te recomendaría el Sofá Patagonia.')
    expect(screen.getByText('Sin stock')).toBeInTheDocument()
  })

  it('sin sugerencias ni productos no rompe (respuesta de un RAG viejo)', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Hacemos envíos a todo el país.',
      fuentes: [],
    })

    const user = userEvent.setup()
    render(<AsistenteWidget />)
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), '¿Hacen envíos?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Hacemos envíos a todo el país.')).toBeInTheDocument()
  })
})
