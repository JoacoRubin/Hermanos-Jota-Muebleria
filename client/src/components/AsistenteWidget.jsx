import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AsistenteService from '../services/chatService'
import './AsistenteWidget.css'

const SALUDO = {
  de: 'bot',
  texto:
    '¡Hola! Soy el asistente de Hermanos Jota. Te puedo ayudar con envíos, ' +
    'garantía, pagos y cuidado de los muebles. ¿Qué querés saber?',
}

// Solo para el primer mensaje, antes de que el usuario pregunte algo (todavía
// no hay sugerencias del bot). Después de cada respuesta, las sugerencias son
// las que el propio RAG generó para ESA pregunta (m.sugerencias).
const SUGERENCIAS_INICIALES = [
  '¿Hacen envíos al interior?',
  '¿Qué garantía tienen los muebles?',
  '¿Puedo pagar en cuotas?',
]

const formatearPrecio = (precio) =>
  typeof precio === 'number' ? precio.toLocaleString('es-AR') : '—'

/**
 * Asistente flotante (RAG).
 *
 * ⚠️ Se monta en `App.jsx`, hermano de `<Routes>`, NO dentro de ModernLayout.
 *
 * Estuvo dentro del layout, y como cada página renderiza su propio
 * `<ModernLayout>`, al navegar React desmontaba este componente entero y lo
 * volvía a montar: la conversación se perdía en cada click del menú. Si algún
 * día vuelve a colgar de una página, el bug vuelve con él —hay tests en
 * `AsistentePersistencia.test.jsx` que lo cazan.
 */
function AsistenteWidget() {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([SALUDO])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const finRef = useRef(null)

  // Autoscroll al último mensaje. El `?.` en el método cubre entornos donde
  // scrollIntoView no existe (jsdom en los tests, navegadores muy viejos).
  useEffect(() => {
    finRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [mensajes, cargando])

  async function preguntar(preguntaTexto) {
    const pregunta = (preguntaTexto ?? texto).trim()
    if (!pregunta || cargando) return

    setMensajes((prev) => [...prev, { de: 'user', texto: pregunta }])
    setTexto('')
    setCargando(true)

    try {
      const { respuesta, fuentes, sugerencias, productos } =
        await AsistenteService.preguntar(pregunta)
      setMensajes((prev) => [
        ...prev,
        { de: 'bot', texto: respuesta, fuentes, sugerencias, productos },
      ])
    } catch (error) {
      setMensajes((prev) => [
        ...prev,
        {
          de: 'bot',
          error: true,
          texto:
            error.detalle ||
            'Uy, no pude responder en este momento. Probá de nuevo en un ratito.',
        },
      ])
    } finally {
      setCargando(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    preguntar()
  }

  return (
    <>
      <button
        type="button"
        className="asistente-fab"
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? '✕' : '💬'}
      </button>

      {abierto && (
        <div
          className="asistente-panel"
          role="dialog"
          aria-label="Asistente de Hermanos Jota"
        >
          <div className="asistente-header">
            <span>Asistente Hermanos Jota</span>
            <button
              type="button"
              className="asistente-cerrar"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
            >
              ✕
            </button>
          </div>

          <div className="asistente-mensajes">
            {mensajes.map((m, i) => {
              const esUltimoMensaje = i === mensajes.length - 1
              return (
                <div
                  key={i}
                  className={`asistente-msg ${m.de}${m.error ? ' error' : ''}`}
                >
                  <p>{m.texto}</p>

                  {m.productos?.length > 0 && (
                    <div className="asistente-productos">
                      {/*
                        `<Link>`, NO `<a href>`.

                        Con `<a href>` esto era una navegación de página
                        completa: el navegador tiraba la SPA abajo y la
                        recargaba de cero. No solo se perdía la conversación
                        —también el access token, que vive en memoria, y había
                        que rehacer el refresh. Un click en una recomendación
                        del bot costaba un reinicio entero de la aplicación.
                      */}
                      {m.productos.map((p) => (
                        <Link
                          key={p.id}
                          className={`asistente-producto${p.stock === 0 ? ' sin-stock' : ''}`}
                          to={`/productos/${p.id}`}
                        >
                          {p.imagenUrl && <img src={p.imagenUrl} alt={p.nombre} />}
                          <div className="asistente-producto-info">
                            <span className="asistente-producto-nombre">{p.nombre}</span>
                            <span className="asistente-producto-precio">
                              ${formatearPrecio(p.precio)}
                            </span>
                            {p.stock === 0 && (
                              <span className="asistente-producto-sinstock">Sin stock</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Sugerencias solo en el último mensaje del bot: son la
                      invitación a seguir la conversación, no un historial. */}
                  {m.de === 'bot' && esUltimoMensaje && m.sugerencias?.length > 0 && (
                    <div className="asistente-sugerencias">
                      {m.sugerencias.map((s) => (
                        <button key={s} type="button" onClick={() => preguntar(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Sugerencias fijas solo antes de la primera pregunta: todavía no
                hay sugerencias generadas por el RAG para invitar a preguntar. */}
            {mensajes.length === 1 && (
              <div className="asistente-sugerencias">
                {SUGERENCIAS_INICIALES.map((s) => (
                  <button key={s} type="button" onClick={() => preguntar(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {cargando && (
              <div className="asistente-msg bot">
                <p className="asistente-escribiendo">Escribiendo…</p>
              </div>
            )}

            <div ref={finRef} />
          </div>

          <form className="asistente-input" onSubmit={onSubmit}>
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí tu pregunta…"
              maxLength={500}
              disabled={cargando}
              aria-label="Tu pregunta"
            />
            <button type="submit" disabled={cargando || !texto.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default AsistenteWidget
