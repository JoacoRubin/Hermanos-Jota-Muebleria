import { useState, useRef, useEffect } from 'react'
import AsistenteService from '../services/chatService'
import './AsistenteWidget.css'

const SALUDO = {
  de: 'bot',
  texto:
    '¡Hola! Soy el asistente de Hermanos Jota. Te puedo ayudar con envíos, ' +
    'garantía, pagos y cuidado de los muebles. ¿Qué querés saber?',
}

const SUGERENCIAS = [
  '¿Hacen envíos al interior?',
  '¿Qué garantía tienen los muebles?',
  '¿Puedo pagar en cuotas?',
]

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
      const { respuesta, fuentes } = await AsistenteService.preguntar(pregunta)
      setMensajes((prev) => [...prev, { de: 'bot', texto: respuesta, fuentes }])
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

  // Fuentes únicas por documento, para no repetir el mismo archivo.
  const fuentesUnicas = (fuentes) => [...new Set((fuentes || []).map((f) => f.fuente))]

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
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`asistente-msg ${m.de}${m.error ? ' error' : ''}`}
              >
                <p>{m.texto}</p>
                {fuentesUnicas(m.fuentes).length > 0 && (
                  <p className="asistente-fuentes">
                    Fuente: {fuentesUnicas(m.fuentes).join(', ')}
                  </p>
                )}
              </div>
            ))}

            {/* Sugerencias solo al inicio, para invitar a preguntar. */}
            {mensajes.length === 1 && (
              <div className="asistente-sugerencias">
                {SUGERENCIAS.map((s) => (
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
