import React from "react";


export default function DetallesProducto({ producto ,onVolver}) {
    if (!producto) {
        return (
            <div>
                <h2>Error: No se recibió el producto</h2>
                <button onClick={onVolver}>Volver al catalogo</button>
            </div>
        );
    }

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
            
            <button onClick={onVolver}>Volver al catalogo</button>
        </div>
    )
}