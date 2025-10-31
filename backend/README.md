# 🪑 Mueblería Hermanos Jota - E-commerce Full Stack

## 👥 Integrantes del Proyecto
Joaquin Rubinstein
Andres Suarez
Gonzalo Ruiz
Guillermo Villalba
Ezequiel Salvatierra

---

## 📋 Descripción del Proyecto

**Mueblería Hermanos Jota** es una aplicación web de e-commerce desarrollada para la venta de muebles premium. El proyecto implementa una arquitectura Full Stack con Node.js/Express en el backend y React/Vite en el frontend, ofreciendo una experiencia de usuario completa para la navegación, visualización y gestión de productos.

### ✨ Funcionalidades Sprint 5 y 6
- 📱 **Catálogo de Productos**: Visualización interactiva de muebles con imágenes
- 🔍 **Vista de Detalles**: Información completa de cada producto
- 🛒 **Carrito de Compras**: Sistema completo de agregar/quitar/gestionar productos
- 📞 **Formulario de Contacto**: Sistema de contacto con validación
- 🧭 **Navegación SPA**: Navegación fluida entre secciones sin recarga
- 🗄️ **Persistencia real**: Productos guardados en MongoDB Atlas
- 📝 **CRUD Completo**: Crear, editar y eliminar productos desde el frontend
- 🔐 **Variables de entorno**: Configuración segura con `.env`

---

## 🚀 Instalación y Ejecución

### 1️⃣ Clonar el Repositorio
```bash
git clone https://github.com/TU_USUARIO/Hermanos-Jota-Muebleria-Sprint5-6.git
cd Hermanos-Jota-Muebleria-Sprint5-6
```

### 2️⃣ Configurar Variables de Entorno

#### Backend (`backend/.env`)
Crea el archivo `.env` en la carpeta `backend` y agrega:
```
MONGO_URI=mongodb+srv://<usuario>:<contraseña>@cluster0.jo6svin.mongodb.net/?appName=Cluster0
PORT=5000
```
- Reemplaza `<usuario>` y `<contraseña>` por tus credenciales de MongoDB Atlas.

#### Frontend
No requiere variables de entorno para desarrollo local. El frontend está configurado para consumir la API en `http://localhost:5000`.

---

### 3️⃣ Instalar Dependencias

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ..
npm install
```

---

### 4️⃣ Ejecutar el Proyecto

#### Iniciar el Backend (Puerto 5000)
```bash
# Desde la carpeta backend
npm start
```
El servidor backend estará disponible en: `http://localhost:5000`
- **API productos**: http://localhost:5000/api/productos

#### Iniciar el Frontend (Puerto 3000)
```bash
# Desde la raíz del proyecto (en otra terminal)
npm run dev
```
La aplicación frontend estará disponible en: `http://localhost:3000`

### 📌 Comandos Rápidos

#### Opción 1: Dos terminales separadas
```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend  
npm run dev
```

#### Opción 2: Una sola terminal (Windows PowerShell)
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start" ; Start-Sleep -Seconds 3 ; npm run dev
```

---

### 🔧 Tecnologías Utilizadas

#### Backend
- **Node.js**: Runtime de JavaScript
- **Express.js**: Framework web minimalista
- **Mongoose**: ODM para MongoDB
- **MongoDB Atlas**: Base de datos en la nube
- **Middleware personalizado**: Logging y manejo de errores

#### Frontend
- **React 18**: Biblioteca de interfaz de usuario
- **Vite**: Herramienta de build rápida
- **CSS**: Estilos personalizados con efectos y responsividad
- **Fetch API**: Comunicación con el backend
- **React Router DOM**: Navegación profesional

---

### 🎯 Decisiones de Arquitectura

- **Separación Backend/Frontend**: APIs REST para comunicación
- **Single Page Application (SPA)**: Navegación fluida sin recargas
- **Componentes Reutilizables**: Código modular y mantenible
- **Estado Local vs Global**: Estado centralizado y contextos
- **API RESTful**: Endpoints CRUD completos
- **Persistencia real**: MongoDB Atlas
- **Variables de entorno**: Seguridad y flexibilidad

---
### ✅ Requisitos Técnicos Implementados
- **Backend API REST** con Node.js, Express y MongoDB Atlas
- **Frontend SPA** con React y Vite
- **Persistencia real** de productos
- **Sistema de enrutamiento** y navegación
- **CRUD completo** desde el frontend
- **Arquitectura modular** y escalable
- **Manejo de estados** y componentes reutilizables
- **Variables de entorno** para configuración segura

### ✅ Funcionalidades de E-commerce
- **Catálogo de productos** con visualización de imágenes
- **Sistema de carrito** con funciones CRUD
- **Formularios funcionales** con validación
- **Interfaz responsiva** y moderna
- **Integración Frontend-Backend** completa

### ✅ Buenas Prácticas Aplicadas
- **Separación de responsabilidades** (MVC pattern)
- **Código limpio** y documentado
- **Manejo de errores** y estados de carga
- **Estructura de proyecto** organizada
- **Control de versiones** con Git



## 🚀 URLs de la Aplicación

Una vez ejecutados ambos servidores:

### 🖥️ Frontend (Interfaz de Usuario)
- **Aplicación principal**: http://localhost:3000
- **Navegación disponible**: Inicio, Productos, Detalle, Contacto, Carrito, Crear/Editar Producto
- **Aplicación desplegada**: [https://precious-fudge-aa2969.netlify.app](https://precious-fudge-aa2969.netlify.app)

### 🔌 Backend (API REST)
- **API productos**: http://localhost:5000/api/productos
- **Producto específico**: http://localhost:5000/api/productos/:id

---



