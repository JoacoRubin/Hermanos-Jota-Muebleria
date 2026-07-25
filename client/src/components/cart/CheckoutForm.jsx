import { useState } from 'react'

const MIN_CARACTERES_DIRECCION = 10

function CheckoutForm({ onConfirmar, onCancelar, loading }) {
  const [direccionEnvio, setDireccionEnvio] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (evento) => {
    evento.preventDefault()

    const direccion = direccionEnvio.trim()

    // Se valida acá lo mismo que valida la API, para dar feedback inmediato.
    // La validación del servidor sigue siendo la que manda.
    if (direccion.length < MIN_CARACTERES_DIRECCION) {
      setError(
        `Ingresá una dirección completa (al menos ${MIN_CARACTERES_DIRECCION} caracteres).`
      )
      return
    }

    setError(null)
    onConfirmar({ direccionEnvio: direccion, notas: notas.trim() })
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <h3>Información de envío</h3>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="direccionEnvio">Dirección de envío *</label>
        <textarea
          id="direccionEnvio"
          value={direccionEnvio}
          onChange={(evento) => {
            setDireccionEnvio(evento.target.value)
            if (error) setError(null)
          }}
          placeholder="Calle, número, piso, localidad, provincia…"
          rows={3}
          maxLength={300}
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="notas">Notas para la entrega (opcional)</label>
        <textarea
          id="notas"
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
          placeholder="Timbre, horarios, referencias…"
          rows={2}
          maxLength={500}
          disabled={loading}
        />
      </div>

      <div className="form-actions form-actions--end">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancelar}
          disabled={loading}
        >
          Cancelar
        </button>
        <button type="submit" className="explore-button" disabled={loading}>
          {loading ? 'Procesando…' : 'Confirmar pedido'}
        </button>
      </div>
    </form>
  )
}

export default CheckoutForm
