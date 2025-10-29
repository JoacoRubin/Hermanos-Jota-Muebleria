import { useState } from 'react'
import ModernLayout from '../components/ModernLayout'

function Contact() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    mensaje: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validaciones básicas
    if (!formData.nombre.trim() || !formData.email.trim() || !formData.mensaje.trim()) {
      alert('Por favor completa todos los campos')
      return
    }

    // Aquí normalmente enviarías los datos a un servidor
    console.log('Formulario de contacto enviado:', formData)
    
    setSubmitted(true)
    
    // Resetear formulario después de 3 segundos
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ nombre: '', email: '', mensaje: '' })
    }, 3000)
  }

  if (submitted) {
    return (
      <ModernLayout>
        <div className="content-card" style={{ textAlign: 'center' }}>
          <h1>¡Mensaje Enviado!</h1>
          <p>Gracias por contactarnos. Te responderemos pronto.</p>
          <div style={{ 
            backgroundColor: 'var(--verde-salvia)',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            margin: '2rem auto',
            maxWidth: '400px'
          }}>
            ✓ Tu mensaje ha sido recibido exitosamente
          </div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="content-card">
        <h1>Contacto</h1>
        <p style={{ textAlign: 'center', margin: '2rem 0' }}>
          ¿Tienes alguna pregunta o comentario? ¡Nos encantaría saber de ti!
        </p>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="nombre">Nombre Completo *</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            placeholder="Tu nombre completo"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Correo Electrónico *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="tu@email.com"
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
            rows="6"
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <button type="submit" className="btn btn-primary">
            Enviar Mensaje
          </button>
        </div>
      </form>

      <div style={{ 
        marginTop: '3rem', 
        padding: '2rem',
        backgroundColor: 'rgba(160, 82, 45, 0.1)',
        borderRadius: '8px',
        textAlign: 'center',
        border: '1px solid rgba(160, 82, 45, 0.2)'
      }}>
        <h3>Información de Contacto</h3>
        <p>📧 Email: info@hermanosjota.com.ar</p>
        <p>📞 Teléfono: +54 (11) 4567-8900</p>
        <p>📍 Dirección: Av. San Juan 2847, CABA, Argentina</p>
      </div>
      </div>
    </ModernLayout>
  )
}

export default Contact