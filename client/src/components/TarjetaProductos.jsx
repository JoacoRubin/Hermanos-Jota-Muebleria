import React from "react";

export default function TarjetaProductos({nombre, descripcion, detalles, precio, imagen}){
    return (
        <div className="tarjeta-productos">
            <h3 className="producto-nombre">{nombre}</h3>
            <img src={`http://localhost:3000${imagen}`} alt={nombre} className="producto-imagen"/>
            <p className="producto-descripcion">{descripcion}</p>
            <div className="producto-precio">Precio: ${precio}</div>

        </div>
    )
}