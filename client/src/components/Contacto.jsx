import React, { useState } from 'react';

export default function Contacto({ onVolver }) {
    // Estados para cada input del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        telefono: '',
        asunto: '',
        mensaje: ''
    });

    const [mensajeExito, setMensajeExito] = useState('');
    const [errores, setErrores] = useState({});

    // Función para manejar cambios en los inputs
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        
        // Limpiar error del campo cuando el usuario empieza a escribir
        if (errores[name]) {
            setErrores(prevErrores => ({
                ...prevErrores,
                [name]: ''
            }));
        }
    };

    // Función para validar el formulario
    const validarFormulario = () => {
        const nuevosErrores = {};

        if (!formData.nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es requerido';
        }

        if (!formData.email.trim()) {
            nuevosErrores.email = 'El email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            nuevosErrores.email = 'El email no es válido';
        }

        if (!formData.mensaje.trim()) {
            nuevosErrores.mensaje = 'El mensaje es requerido';
        }

        if (!formData.asunto.trim()) {
            nuevosErrores.asunto = 'El asunto es requerido';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    // Función para manejar el envío del formulario
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (validarFormulario()) {
            // Console.log del objeto de estado como se requiere
            console.log('Datos del formulario enviados:', formData);
            
            // Mostrar mensaje de éxito en la UI
            setMensajeExito('¡Mensaje enviado exitosamente! Nos pondremos en contacto contigo pronto.');
            
            // Limpiar el formulario
            setFormData({
                nombre: '',
                email: '',
                telefono: '',
                asunto: '',
                mensaje: ''
            });

            // Ocultar mensaje de éxito después de 5 segundos
            setTimeout(() => {
                setMensajeExito('');
            }, 5000);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Contáctanos</h2>
            <p>¿Tienes alguna pregunta sobre nuestros muebles? ¡Nos encantaría ayudarte!</p>

            {mensajeExito && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '12px',
                    borderRadius: '5px',
                    marginBottom: '20px',
                    border: '1px solid #c3e6cb'
                }}>
                    {mensajeExito}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label htmlFor="nombre" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Nombre *
                    </label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: errores.nombre ? '2px solid #dc3545' : '1px solid #ddd',
                            borderRadius: '5px',
                            fontSize: '16px'
                        }}
                        placeholder="Tu nombre completo"
                    />
                    {errores.nombre && (
                        <span style={{ color: '#dc3545', fontSize: '14px' }}>{errores.nombre}</span>
                    )}
                </div>

                <div>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Email *
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: errores.email ? '2px solid #dc3545' : '1px solid #ddd',
                            borderRadius: '5px',
                            fontSize: '16px'
                        }}
                        placeholder="tu@email.com"
                    />
                    {errores.email && (
                        <span style={{ color: '#dc3545', fontSize: '14px' }}>{errores.email}</span>
                    )}
                </div>

                <div>
                    <label htmlFor="telefono" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        id="telefono"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            fontSize: '16px'
                        }}
                        placeholder="Tu número de teléfono (opcional)"
                    />
                </div>

                <div>
                    <label htmlFor="asunto" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Asunto *
                    </label>
                    <select
                        id="asunto"
                        name="asunto"
                        value={formData.asunto}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: errores.asunto ? '2px solid #dc3545' : '1px solid #ddd',
                            borderRadius: '5px',
                            fontSize: '16px'
                        }}
                    >
                        <option value="">Selecciona un asunto</option>
                        <option value="consulta-producto">Consulta sobre producto</option>
                        <option value="cotizacion">Solicitar cotización</option>
                        <option value="entrega">Consulta sobre entrega</option>
                        <option value="garantia">Garantía y devoluciones</option>
                        <option value="otro">Otro</option>
                    </select>
                    {errores.asunto && (
                        <span style={{ color: '#dc3545', fontSize: '14px' }}>{errores.asunto}</span>
                    )}
                </div>

                <div>
                    <label htmlFor="mensaje" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Mensaje *
                    </label>
                    <textarea
                        id="mensaje"
                        name="mensaje"
                        value={formData.mensaje}
                        onChange={handleChange}
                        rows="5"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: errores.mensaje ? '2px solid #dc3545' : '1px solid #ddd',
                            borderRadius: '5px',
                            fontSize: '16px',
                            resize: 'vertical'
                        }}
                        placeholder="Escribe tu mensaje aquí..."
                    />
                    {errores.mensaje && (
                        <span style={{ color: '#dc3545', fontSize: '14px' }}>{errores.mensaje}</span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                        type="submit"
                        style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        Enviar Mensaje
                    </button>
                    <button
                        type="button"
                        onClick={onVolver}
                        style={{
                            backgroundColor: '#6c757d',
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Volver
                    </button>
                </div>
            </form>
        </div>
    );
}