import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import AsistenteService from '../services/chatService'
import { formatearPrecio } from '../constants'
import './AsistenteWidget.css'

const NOMBRE = 'KIMBAI'

// Clave del historial en sessionStorage. `session` y no `local` a propósito: la
// conversación tiene sentido mientras dura la visita; que sobreviva días en el
// navegador sería guardar de más.
const STORAGE_KEY = 'kimbai_chat'

const SALUDO = {
  de: 'bot',
  texto:
    `¡Hola! Soy ${NOMBRE}, el asistente de Hermanos Jota. Te puedo ayudar con ` +
    'envíos, garantía, pagos y cuidado de los muebles. ¿Qué querés saber?',
}

/**
 * Recupera la conversación de sessionStorage para que un F5 no la borre.
 *
 * El estado del widget vive en memoria (por eso sobrevive a la navegación entre
 * páginas, ver App.jsx), pero un refresh recarga el módulo y lo perdía. Esto lo
 * persiste. Si no hay nada guardado, o está corrupto, se arranca con el saludo.
 */
function leerHistorial() {
  try {
    const guardado = sessionStorage.getItem(STORAGE_KEY)
    const parsed = guardado ? JSON.parse(guardado) : null
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [SALUDO]
  } catch {
    return [SALUDO]
  }
}

// Solo para el primer mensaje, antes de que el usuario pregunte algo (todavía
// no hay sugerencias del bot). Después de cada respuesta, las sugerencias son
// las que el propio RAG generó para ESA pregunta (m.sugerencias).
const SUGERENCIAS_INICIALES = [
  '¿Hacen envíos al interior?',
  '¿Qué garantía tienen los muebles?',
  '¿Puedo pagar en cuotas?',
]

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
  const [mensajes, setMensajes] = useState(leerHistorial)
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)

  // Persistir la charla en cada cambio. Solo si hay algo más que el saludo: no
  // vale la pena ensuciar el storage con el estado inicial. Un storage lleno o
  // deshabilitado no puede tumbar el chat, que sigue funcionando en memoria.
  useEffect(() => {
    if (mensajes.length <= 1) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes))
    } catch {
      // Sin storage disponible: el historial vive en memoria y basta.
    }
  }, [mensajes])
  const finRef = useRef(null)
  const inputRef = useRef(null)
  const mensajesRef = useRef(null)

  // Última posición de scroll del transcript, para sobrevivir al cierre.
  // `null` significa "todavía nadie scrolleó": en la primera apertura vamos al
  // fondo, que es donde está lo último que se dijo.
  const scrollPrevio = useRef(null)

  // Autoscroll al último mensaje. El `?.` en el método cubre entornos donde
  // scrollIntoView no existe (jsdom en los tests, navegadores muy viejos).
  //
  // ⚠️ `abierto` NO va en las dependencias, a propósito. Si estuviera, reabrir
  // el panel dispararía este scroll animado sobre un transcript recién montado
  // (o sea: arrancar en el saludo y desfilar hasta el final). Reabrir se maneja
  // en el efecto de abajo, de una y sin animación. Con el panel cerrado
  // `finRef.current` es null y el `?.` corta solo.
  useEffect(() => {
    finRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [mensajes, cargando])

  // Cerrar desmonta el panel, así que el transcript pierde su scrollTop y
  // vuelve a nacer en 0 —arriba, en el saludo—. Acá se lo devolvemos.
  //
  // Va en `useLayoutEffect` y no en `useEffect` porque corre antes del paint: el
  // usuario nunca ve el salto desde el principio de la conversación.
  useLayoutEffect(() => {
    if (!abierto) return

    const transcript = mensajesRef.current
    if (!transcript) return

    transcript.scrollTop =
      scrollPrevio.current ?? transcript.scrollHeight - transcript.clientHeight
  }, [abierto])

  // Al abrir el panel, el foco va al campo de texto. Sin esto el usuario de
  // teclado tiene que tabular por toda la página para llegar a escribir.
  useEffect(() => {
    if (abierto) inputRef.current?.focus?.()
  }, [abierto])

  // Escape cierra, que es lo que cualquiera espera de un panel flotante.
  useEffect(() => {
    if (!abierto) return

    const alPresionar = (evento) => {
      if (evento.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [abierto])

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
        aria-label={abierto ? `Cerrar ${NOMBRE}` : `Abrir ${NOMBRE}`}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {/* El anillo que gira es un ::before del botón; el contenido va en su
            propio span para quedarse quieto. Rotar el botón entero dejaría el
            nombre cabeza abajo la mitad del tiempo.

            Cerrado muestra el nombre —un 💬 genérico no dice de quién es el
            asistente—. Abierto pasa a la cruz: el header ya dice KIMBAI, y
            repetirlo dejaría sin señal de que este botón ahora cierra. */}
        <span className={`asistente-fab-texto${abierto ? ' es-cerrar' : ''}`}>
          {abierto ? (
            '✕'
          ) : (
            <>
              {/* KIMB + AI: el "AI" va destacado porque es lo que el nombre
                  esconde. Spans y no <strong>: es un realce de marca, no
                  énfasis semántico, y el nombre accesible del botón ya lo da
                  el aria-label —así el lector de pantalla dice "Abrir KIMBAI"
                  de una en vez de deletrearlo en pedazos. */}
              KIMB<span className="asistente-fab-ai">AI</span>
            </>
          )}
        </span>
      </button>

      {abierto && (
        <div
          className="asistente-panel"
          role="dialog"
          aria-label={`${NOMBRE}, asistente de Hermanos Jota`}
        >
          <div className="asistente-header">
            <span>{NOMBRE}</span>
            {/* "Cerrar" pelado, sin el nombre: con el panel abierto el FAB
                también cierra, y dos botones con el mismo nombre accesible es
                una ambigüedad para quien navega por lector de pantalla. Acá el
                contexto lo da el `aria-label` del diálogo que lo contiene. */}
            <button
              type="button"
              className="asistente-cerrar"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/*
            `role="log"` trae `aria-live="polite"` implícito, pero se declara
            explícito por compatibilidad. Sin esto, un usuario con lector de
            pantalla NUNCA se entera de que llegó la respuesta: escribe la
            pregunta, se manda, y el silencio es total.

            `aria-atomic="false"` es lo que hace que se anuncie solo el mensaje
            nuevo y no la conversación entera de vuelta en cada respuesta.
          */}
          <div
            className="asistente-mensajes"
            role="log"
            aria-live="polite"
            aria-atomic="false"
            ref={mensajesRef}
            // Se anota en cada scroll en vez de leerlo en el cleanup del cierre:
            // cuando React desmonta, depender de que el nodo siga conectado para
            // poder leer su scrollTop es apostar al orden interno del commit.
            onScroll={(e) => {
              scrollPrevio.current = e.currentTarget.scrollTop
            }}
          >
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
                          className={`asistente-producto${p.disponible === false ? ' sin-stock' : ''}`}
                          to={`/productos/${p.id}`}
                        >
                          {p.imagenUrl && <img src={p.imagenUrl} alt={p.nombre} />}
                          <div className="asistente-producto-info">
                            <span className="asistente-producto-nombre">{p.nombre}</span>
                            {/* El mismo `formatearPrecio` que el catálogo y el
                                carrito. Antes este archivo tenía su PROPIA
                                versión, con el "$" puesto a mano al lado: dos
                                implementaciones de "mostrar un precio" en la
                                misma app es cómo empiezan a divergir. */}
                            <span className="asistente-producto-precio">
                              {formatearPrecio(p.precio)}
                            </span>
                            {/*
                              Nombre, precio y disponibilidad vienen de MongoDB,
                              no de lo que dijo el modelo: Express rehidrata los
                              productos antes de responder. Y `lowStockMessage`
                              sale del MISMO serializer que el catálogo, así que
                              el bot y la ficha del producto no se pueden
                              contradecir sobre la escasez.
                            */}
                            {p.lowStockMessage && (
                              <span className="asistente-producto-stock">
                                {p.lowStockMessage}
                              </span>
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
              ref={inputRef}
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
