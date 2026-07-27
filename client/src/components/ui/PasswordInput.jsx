import { useState } from 'react'

/**
 * Campo de contraseña con botón para mostrarla u ocultarla.
 *
 * Envuelve solo el input, no el `<label>` ni las ayudas: así cada pantalla
 * mantiene su propio texto y su `aria-describedby` sin que este componente
 * tenga que conocerlos.
 *
 * Todo lo demás (`required`, `minLength`, `autoComplete`, `placeholder`…) pasa
 * de largo al input, para que se siga usando igual que uno nativo.
 */
function PasswordInput({ id, className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-input">
      <input
        {...props}
        id={id}
        className={className}
        // Lo único que cambia es el `type`. El valor sigue siendo el mismo
        // string en el mismo estado: mostrarlo no lo mueve de lugar.
        type={visible ? 'text' : 'password'}
      />

      {/*
        `type="button"` NO es opcional.

        Un `<button>` sin `type` dentro de un `<form>` es `submit` por defecto.
        Sin esto, hacer click en el ojo enviaría el formulario —intentando
        loguearte con la contraseña a medio escribir— en vez de mostrarla.
      */}
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setVisible((actual) => !actual)}
        // El nombre accesible cambia con el estado: un lector de pantalla
        // necesita saber qué va a pasar si lo aprieta, no qué está pasando.
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        // El foco se queda en el input al tabular: el ojo es una ayuda
        // opcional, no un paso del formulario.
        tabIndex={-1}
      >
        <span aria-hidden="true">{visible ? '🙈' : '👁️'}</span>
      </button>
    </div>
  )
}

export default PasswordInput
