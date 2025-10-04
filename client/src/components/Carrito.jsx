import React from "react";

export default function Carrito({ carrito, onVolver, onAñadirAlCarrito, onQuitarDelCarrito, onEliminarDelCarrito }) {
    // Calcular el total del carrito
    const totalCarrito = carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);

    if (carrito.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Tu carrito está vacío</h2>
                <p>¡Añade algunos productos para empezar!</p>
                <button onClick={onVolver}>Volver al catálogo</button>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h2>Tu Carrito de Compras</h2>
            <div>
                {carrito.map(item => (
                    <div 
                        key={item.id} 
                        style={{ 
                            border: '1px solid #ddd', 
                            borderRadius: '8px', 
                            padding: '1rem', 
                            margin: '1rem 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}
                    >
                        <img 
                            src={`http://localhost:3000${item.imagen}`} 
                            alt={item.nombre}
                            style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <div style={{ flex: 1 }}>
                            <h4>{item.nombre}</h4>
                            <p>Precio unitario: ${item.precio}</p>
                            <p><strong>Subtotal: ${item.precio * item.cantidad}</strong></p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                                onClick={() => onQuitarDelCarrito(item.id)}
                                style={{
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    padding: '5px 10px',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                }}
                            >
                                -
                            </button>
                            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                {item.cantidad}
                            </span>
                            <button 
                                onClick={() => onAñadirAlCarrito(item)}
                                style={{
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    padding: '5px 10px',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                }}
                            >
                                +
                            </button>
                            <button 
                                onClick={() => onEliminarDelCarrito(item.id)}
                                style={{
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    padding: '5px 10px',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    marginLeft: '10px'
                                }}
                            >
                                🗑️ Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={{ 
                marginTop: '2rem', 
                padding: '1rem', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                textAlign: 'center'
            }}>
                <h3>Total: ${totalCarrito}</h3>
                <div style={{ marginTop: '1rem' }}>
                    <button 
                        onClick={onVolver}
                        style={{ 
                            marginRight: '10px',
                            backgroundColor: '#6c757d'
                        }}
                    >
                        Seguir Comprando
                    </button>
                    <button 
                        style={{ 
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        Proceder al Pago
                    </button>
                </div>
            </div>
        </div>
    );
}