import React from "react";

export default function Nav ({ cantidadCarrito, onMostrarCarrito, onMostrarContacto, onMostrarInicio, onMostrarProductos }) { 
    return (
        <nav className="Navbar">
            <div className="nav-tittle">
                <h1>Muebleria Hermanos JOTA</h1>
            </div>

            <button 
                onClick={onMostrarInicio}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: 'inherit',
                    fontWeight: 'bold'
                }}
            >
                Inicio
            </button> | 
            <button 
                onClick={onMostrarProductos}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: 'inherit',
                    fontWeight: 'bold'
                }}
            >
                Productos
            </button> |
            <button 
                onClick={onMostrarContacto}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: 'inherit',
                    fontWeight: 'bold'
                }}
            >
                Contacto
            </button> |
            <button 
                className="carrito-contador" 
                onClick={onMostrarCarrito}
                style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '15px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer'
                }}
            >
                🛒 Carrito ({cantidadCarrito || 0})
            </button>
            
        </nav>
    )
}