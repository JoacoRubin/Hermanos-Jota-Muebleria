import React from "react";

export default function Nav () { 
    return (
        <nav className="Navbar">
            <div className="nav-tittle">
                <h1>Muebleria Hermanos JOTA</h1>
            </div>

            <a href="#inicio">Inicio</a> | 
            <a href="#producto">Productos</a> |
            <a href="#contacto">Contacto</a>
            
        </nav>
    )
}