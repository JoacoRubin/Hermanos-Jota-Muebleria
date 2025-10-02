import React, { useState, useEffect } from 'react'
import './App.css'
import TarjetaProductos from './components/TarjetaProductos'
import ListaProductos from './components/ListaProductos'
import Nav from './components/Nav'
import DetallesProducto from './components/DetallesProducto'
import Footer from './components/Footer'

export default function App() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null); 

  useEffect(()=> {
    fetch("http://localhost:3000/api/productos")
    .then(res => res.json())
    .then(data => {
      setProductos(data); 
      setCargando(false);})
    .catch(err => {
      setError(err.message);
      setCargando(false);
    });

  },[]);
   
  if (cargando) { 
    return (
      <div className="App">
        <h1>Cargando...</h1>
      </div>
    );
  }
  if(error)
  return (
    <div className="App">
      <h1>Error al cargar los productos</h1>
    </div>
  );

  return (
    <>
      <div className='nav-bar'>
        <Nav />
      </div>
      <div className='lista-productos'>
        {!productoSeleccionado?(
          <ListaProductos productos={productos} onSeleccionar={setProductoSeleccionado} />
        ) : (
          <DetallesProducto 
          producto={productoSeleccionado}
          onVolver={() => setProductoSeleccionado(null)}
          />
        )
        }
      </div>
      <Footer/>
    </>
  )
}
