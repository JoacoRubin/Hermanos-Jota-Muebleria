import { useEffect, useRef } from 'react'

/**
 * Diálogo de confirmación accesible.
 *
 * Cubre lo que `window.confirm` da gratis y la mayoría de los modales caseros
 * olvidan: foco inicial dentro del diálogo, Escape para cancelar, foco
 * atrapado mientras está abierto y roles ARIA correctos.
 */
function ConfirmDialog({
  titulo,
  mensaje,
  textoConfirmar,
  textoCancelar,
  peligroso,
  onConfirm,
  onCancel,
}) {
  const dialogoRef = useRef(null)
  const confirmarRef = useRef(null)

  useEffect(() => {
    confirmarRef.current?.focus()

    const alPresionarTecla = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        onCancel()
        return
      }

      if (evento.key !== 'Tab') return

      // Trampa de foco: sin esto se puede tabular hasta la página de atrás,
      // que está tapada por el overlay.
      const focusables = dialogoRef.current?.querySelectorAll('button')
      if (!focusables?.length) return

      const primero = focusables[0]
      const ultimo = focusables[focusables.length - 1]

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [onCancel])

  return (
    <div
      className="dialogo-overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogoRef}
        className="dialogo"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby={mensaje ? 'dialogo-mensaje' : undefined}
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="dialogo-titulo" className="dialogo__titulo">
          {titulo}
        </h2>

        {mensaje && (
          <p id="dialogo-mensaje" className="dialogo__mensaje">
            {mensaje}
          </p>
        )}

        <div className="dialogo__acciones">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {textoCancelar}
          </button>
          <button
            ref={confirmarRef}
            type="button"
            className={`btn ${peligroso ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
