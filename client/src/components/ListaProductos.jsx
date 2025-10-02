import React from "react";
import TarjetaProductos from "./TarjetaProductos";

export default function ListaProductos ({productos, onSeleccionar}){
    return(
        <div>
              {productos.map(producto =>(
                     <div key={producto.id}>
                      <TarjetaProductos
                        
                        nombre={producto.nombre}
                        imagen={producto.imagen}
                        descripcion={producto.descripcion}
                        precio={producto.precio}
                        
                      />
                      <button onClick={()=> onSeleccionar(producto)}>
                      Ver Detalles
                    </button>
                    </div>
                    ))}
                   
        </div>
    )
    
        
}
