import React from 'react';

export default function Inicio({ onIrAProductos }) {
    return (
        <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            maxWidth: '1200px', 
            margin: '0 auto' 
        }}>
            {/* Hero Section */}
            <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '4rem 2rem',
                borderRadius: '15px'
            }}>
                <h1 style={{ 
                    fontSize: '3rem', 
                    marginBottom: '1rem',
                    fontWeight: 'bold'
                }}>
                    Bienvenidos a Mueblería Hermanos Jota
                </h1>
                <p style={{ 
                    fontSize: '1.2rem', 
                    marginBottom: '2rem',
                    lineHeight: '1.6'
                }}>
                    Transformamos espacios, creamos hogares. Más de 20 años diseñando 
                    y fabricando muebles de calidad premium con materiales sostenibles.
                </p>
                <button 
                    onClick={onIrAProductos}
                    style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '15px 30px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
                    }}
                >
                    🛋️ Explorar Catálogo
                </button>
            </div>
        </div>
    );
}