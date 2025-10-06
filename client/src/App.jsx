import React, { useState, useEffect } from 'react'
import './App.css'
import TarjetaProductos from './components/TarjetaProductos'
import ListaProductos from './components/ListaProductos'
import Nav from './components/Nav'
import DetallesProducto from './components/DetallesProducto'
import Carrito from './components/Carrito'
import Contacto from './components/Contacto'
import Inicio from './components/Inicio'
import Footer from './components/Footer'

export default function App() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [mostrarCarrito, setMostrarCarrito] = useState(false)
  const [mostrarContacto, setMostrarContacto] = useState(false)
  const [mostrarInicio, setMostrarInicio] = useState(true) 

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

  // Función para añadir productos al carrito
  const añadirAlCarrito = (producto) => {
    setCarrito(carritoActual => {
      const productoExistente = carritoActual.find(item => item.id === producto.id);
      if (productoExistente) {
        // Si el producto ya existe, incrementar la cantidad
        return carritoActual.map(item =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        // Si es nuevo, añadirlo con cantidad 1
        return [...carritoActual, { ...producto, cantidad: 1 }];
      }
    });
  };

  // Función para quitar una unidad del producto del carrito
  const quitarDelCarrito = (productoId) => {
    setCarrito(carritoActual => {
      return carritoActual.map(item => {
        if (item.id === productoId) {
          if (item.cantidad > 1) {
            // Si hay más de 1, decrementar la cantidad
            return { ...item, cantidad: item.cantidad - 1 };
          } else {
            // Si solo hay 1, retornar null para eliminarlo después
            return null;
          }
        }
        return item;
      }).filter(item => item !== null); // Filtrar los items null (eliminados)
    });
  };

  // Función para eliminar completamente un producto del carrito
  const eliminarDelCarrito = (productoId) => {
    setCarrito(carritoActual => 
      carritoActual.filter(item => item.id !== productoId)
    );
  };
   
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

  // Calcular cantidad total de items en el carrito
  const cantidadTotalCarrito = carrito.reduce((total, item) => total + item.cantidad, 0);

  // Función para resetear todas las vistas
  const resetearVistas = () => {
    setMostrarInicio(false);
    setMostrarCarrito(false);
    setMostrarContacto(false);
    setProductoSeleccionado(null);
  };

  return (
    <>
      <div className='nav-bar'>
        <Nav 
          cantidadCarrito={cantidadTotalCarrito} 
          onMostrarCarrito={() => {
            resetearVistas();
            setMostrarCarrito(true);
          }}
          onMostrarContacto={() => {
            resetearVistas();
            setMostrarContacto(true);
          }}
          onMostrarInicio={() => {
            resetearVistas();
            setMostrarInicio(true);
          }}
          onMostrarProductos={() => {
            resetearVistas();
            // No establecemos ningún estado, dejamos que sea la vista por defecto (catálogo)
          }}
        />
      </div>
      <div className='lista-productos'>
        {mostrarInicio ? (
          <Inicio 
            onIrAProductos={() => {
              resetearVistas();
              // Ir al catálogo de productos
            }}
          />
        ) : mostrarContacto ? (
          <Contacto 
            onVolver={() => {
              resetearVistas();
              setMostrarInicio(true);
            }}
          />
        ) : mostrarCarrito ? (
          <Carrito 
            carrito={carrito}
            onVolver={() => {
              resetearVistas();
              // Volver al catálogo
            }}
            onAñadirAlCarrito={añadirAlCarrito}
            onQuitarDelCarrito={quitarDelCarrito}
            onEliminarDelCarrito={eliminarDelCarrito}
          />
        ) : !productoSeleccionado ? (
          <ListaProductos 
            productos={productos} 
            onSeleccionar={(producto) => {
              setProductoSeleccionado(producto);
              setMostrarInicio(false);
            }} 
          />
        ) : (
          <DetallesProducto 
            producto={productoSeleccionado}
            onVolver={() => {
              setProductoSeleccionado(null);
              setMostrarInicio(false);
            }}
            onAñadirAlCarrito={añadirAlCarrito}
            onQuitarDelCarrito={quitarDelCarrito}
            carrito={carrito}
          />
        )}
      </div>
      <Footer/>
    </>
  )
}
