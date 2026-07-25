import { useState } from 'react'
import ModernLayout from '../components/ModernLayout'
import { useUI } from '../contexts/UIContext'
import ContactService from '../services/contactService'

const EMAIL_CONTACTO = 'info@hermanosjota.com.ar'
const ESTADO_INICIAL = { nombre: '', email: '', mensaje: '' }

/**
 * Formulario de contacto.
 *
 * Antes hacía `console.log` y mostraba "¡Mensaje enviado!": el usuario creía
 * que alguien había recibido su consulta y no la recibía nadie. Ahora la
 * consulta se envía de verdad a `POST /api/contacto`, queda persistida y un
 * administrador la ve en el listado.
 */
function Contact() {
  const { toast } = useUI()
  const [formData, setFormData] = useState(ESTADO_INICIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [enviado, setEnviado] = useState(false)

  const handleChange = (evento) => {
    const { name, value } = evento.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (evento) => {
    evento.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const mensaje = await ContactService.enviarConsulta(formData)
      setFormData(ESTADO_INICIAL)
      setEnviado(true)
      toast.success(mensaje || 'Recibimos tu consulta.')
    } catch (err) {
      // Si falla, se dice que falló. No se finge un envío exitoso.
      setError(err.detalle || err.message)
      toast.error('No pudimos enviar tu consulta')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <ModernLayout title="Contacto">
        <div className="content-card estado-vacio">
          <div className="estado-vacio__icono" aria-hidden="true">
            ✉️
          </div>
          <h1>¡Mensaje enviado!</h1>
          <p>
            Recibimos tu consulta y te vamos a responder al email que dejaste.
          </p>
          <button
            type="button"
            className="explore-button"
            onClick={() => setEnviado(false)}
          >
            Enviar otra consulta
          </button>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout title="Contacto">
      <div className="content-card">
        <h1>Contacto</h1>
        <p className="contacto-intro">
          ¿Tenés alguna pregunta o comentario? Nos encantaría saber de vos.
        </p>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre completo *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={80}
              placeholder="Tu nombre completo"
              autoComplete="name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electrónico *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="mensaje">Mensaje *</label>
            <textarea
              id="mensaje"
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              required
              minLength={10}
              maxLength={2000}
              rows={6}
              placeholder="Escribí tu mensaje acá…"
              disabled={loading}
            />
          </div>

          <div className="form-actions form-actions--center">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </div>
        </form>

        <section className="contacto-datos">
          <h2>Información de contacto</h2>
          <p>
            📧 <a href={`mailto:${EMAIL_CONTACTO}`}>{EMAIL_CONTACTO}</a>
          </p>
          <p>
            📞 <a href="tel:+541145678900">+54 (11) 4567-8900</a>
          </p>
          <p>📍 Av. San Juan 2847, CABA, Argentina</p>
        </section>
      </div>
    </ModernLayout>
  )
}

export default Contact
