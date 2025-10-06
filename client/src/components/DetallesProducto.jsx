import React from "react";

export default function DetallesProducto({ producto, onVolver, onAñadirAlCarrito, onQuitarDelCarrito, carrito }) {
    if (!producto) {
        return (
            <div>
                <h2>Error: No se recibió el producto</h2>
                <button onClick={onVolver}>Volver al catalogo</button>
            </div>
        );
    }

    // Encontrar si el producto está en el carrito y su cantidad
    const productoEnCarrito = carrito.find(item => item.id === producto.id);
    const cantidadEnCarrito = productoEnCarrito ? productoEnCarrito.cantidad : 0;

    return(
        <div>
            <h1>{producto.nombre}</h1>
            <img src={`http://localhost:3000${producto.imagen}`} alt={producto.nombre}/>
            <p>{producto.descripcion}</p>
            <p>Precio: ${producto.precio}</p>
             <div>
                <p><strong>Medidas:</strong> {producto.detalles.Medidas}</p>
                <p><strong>Materiales:</strong> {producto.detalles.Materiales}</p>
                <p><strong>Acabado:</strong> {producto.detalles.Acabado}</p>
            </div>
            
            <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                <p><strong>En el carrito: {cantidadEnCarrito} unidad(es)</strong></p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                        onClick={() => onQuitarDelCarrito(producto.id)}
                        disabled={cantidadEnCarrito === 0}
                        style={{
                            backgroundColor: cantidadEnCarrito === 0 ? '#ccc' : '#dc3545',
                            color: 'white',
                            padding: '8px 15px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: cantidadEnCarrito === 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        -
                    </button>
                    <span style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        minWidth: '30px', 
                        textAlign: 'center' 
                    }}>
                        {cantidadEnCarrito}
                    </span>
                    <button 
                        onClick={() => onAñadirAlCarrito(producto)}
                        style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            padding: '8px 15px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        +
                    </button>
                </div>
            </div>
            
            <button onClick={onVolver}>Volver al catalogo</button>
        </div>
    )
}