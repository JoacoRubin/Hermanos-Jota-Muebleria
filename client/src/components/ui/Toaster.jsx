const ICONOS = {
  success: '✓',
  error: '✕',
  info: 'i',
}

/**
 * Componente puramente presentacional: recibe la lista y avisa cuándo cerrar.
 * Toda la lógica vive en UIContext.
 */
function Toaster({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="toaster" role="region" aria-label="Notificaciones">
      {toasts.map(({ id, mensaje, tipo }) => (
        <div
          key={id}
          className={`toast toast--${tipo}`}
          role={tipo === 'error' ? 'alert' : 'status'}
          aria-live={tipo === 'error' ? 'assertive' : 'polite'}
        >
          <span className="toast__icono" aria-hidden="true">
            {ICONOS[tipo]}
          </span>
          <p className="toast__mensaje">{mensaje}</p>
          <button
            type="button"
            className="toast__cerrar"
            onClick={() => onDismiss(id)}
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export default Toaster
