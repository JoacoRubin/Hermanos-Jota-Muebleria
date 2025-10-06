import React from "react";
import TarjetaProductos from "./TarjetaProductos";

export default function ListaProductos ({productos, onSeleccionar}){
    return(
        <div className="lista-productos">
              {productos.map(producto =>(
                      <TarjetaProductos
                        key={producto.id}
                        nombre={producto.nombre}
                        imagen={producto.imagen}
                        descripcion={producto.descripcion}
                        precio={producto.precio}
                        onClick={() => onSeleccionar(producto)}
                      />
                    ))}
        </div>
    )
    
        
}
