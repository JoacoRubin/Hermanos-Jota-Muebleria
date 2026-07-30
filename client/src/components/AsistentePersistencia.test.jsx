import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
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

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
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

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
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

  it('sobrevive a un F5: rehidrata la conversación desde sessionStorage', async () => {
    // Un F5 recarga el módulo y perdía el estado en memoria. Ahora el widget
    // persiste la charla en sessionStorage; desmontar + montar de nuevo simula
    // el refresh y la conversación tiene que volver.
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Cinco años de garantía.',
      fuentes: [],
    })

    const user = userEvent.setup()
    const { unmount } = render(<AppDePrueba />)

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), '¿garantía?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Cinco años de garantía.')

    unmount()
    render(<AppDePrueba />)

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))

    expect(screen.getByText('¿garantía?')).toBeInTheDocument()
    expect(
      screen.getByText('Cinco años de garantía.'),
      'la conversación tiene que rehidratarse tras el refresh'
    ).toBeInTheDocument()
  })

  it('el asistente está disponible en todas las páginas', async () => {
    const user = userEvent.setup()
    render(<AppDePrueba />)

    expect(
      screen.getByRole('button', { name: 'Abrir KIMBAI' })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Ir a inicio' }))

    expect(
      screen.getByRole('button', { name: 'Abrir KIMBAI' })
    ).toBeInTheDocument()
  })
})

/**
 * Cerrar el panel DESMONTA el transcript (`{abierto && ...}`), y con él se va su
 * `scrollTop`: al reabrir nace un div nuevo arrancando en 0, o sea en el saludo.
 * El autoscroll no lo salva porque depende de `[mensajes, cargando]` y al
 * reabrir esas deps no cambiaron. Resultado: volvés al principio de la charla y
 * tenés que scrollear a mano hasta lo último que hablaste.
 */
describe('reabrir devuelve la charla donde quedó, no al principio', () => {
  const ALTO_TOTAL = 1000
  const ALTO_VISIBLE = 400

  // jsdom no hace layout: `scrollHeight` es 0 y las asignaciones a `scrollTop`
  // se descartan porque el elemento "no tiene caja de scroll". Sin estos stubs
  // el test no puede distinguir "restauró la posición" de "no hizo nada".
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => ALTO_TOTAL,
    })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => ALTO_VISIBLE,
    })
    // Data property writable: asignar `el.scrollTop` crea una propiedad propia
    // en la instancia, así que cada elemento recuerda su valor... y uno recién
    // montado vuelve a leer el 0 del prototipo. Igual que el navegador.
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    })
  })

  afterEach(() => {
    delete HTMLElement.prototype.scrollHeight
    delete HTMLElement.prototype.clientHeight
    delete HTMLElement.prototype.scrollTop
  })

  it('restaura la posición de scroll que tenía al cerrarse', async () => {
    AsistenteService.preguntar.mockResolvedValue({
      respuesta: 'Cinco años de garantía.',
      fuentes: [],
    })

    const user = userEvent.setup()
    render(<AppDePrueba />)

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.type(screen.getByLabelText('Tu pregunta'), '¿garantía?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Cinco años de garantía.')

    // El usuario sube a releer algo del medio de la conversación.
    fireEvent.scroll(screen.getByRole('log'), { target: { scrollTop: 620 } })

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))

    expect(
      screen.getByRole('log').scrollTop,
      'al reabrir tiene que seguir donde estaba, no en el saludo'
    ).toBe(620)
  })

  it('la primera apertura arranca en el último mensaje', async () => {
    const user = userEvent.setup()
    render(<AppDePrueba />)

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))

    // Sin posición previa que restaurar, el fondo es lo correcto: nadie abre un
    // chat para leer el mensaje más viejo.
    expect(screen.getByRole('log').scrollTop).toBe(ALTO_TOTAL - ALTO_VISIBLE)
  })

  it('no dispara el scroll animado al reabrir', async () => {
    // Un `scrollIntoView({ behavior: 'smooth' })` sobre un transcript recién
    // montado ES el "se va al principio y scrollea" del reporte. Al reabrir la
    // posición se restaura de una, sin animación.
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    const user = userEvent.setup()
    render(<AppDePrueba />)

    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))
    await user.keyboard('{Escape}')
    scrollIntoView.mockClear()
    await user.click(screen.getByRole('button', { name: 'Abrir KIMBAI' }))

    expect(scrollIntoView).not.toHaveBeenCalled()

    delete HTMLElement.prototype.scrollIntoView
  })
})
