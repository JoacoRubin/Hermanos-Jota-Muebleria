# 🪑 Mueblería Hermanos Jota - E-commerce Full Stack

## 👥 Integrantes del Proyecto

Joaquin Rubinstein
Andres Suarez
Gonzalo Ruiz
Guillermo Villalba
Ezequiel Salvatierra

---

## 📋 Descripción del Proyecto

**Mueblería Hermanos Jota** es una aplicación web de e-commerce desarrollada para la venta de muebles premium. El proyecto implementa una arquitectura Full Stack con Node.js/Express en el backend y React/Vite en el frontend, ofreciendo una experiencia de usuario completa para la navegación, visualización y compra de productos.

### ✨ Funcionalidades Principales

- 🏠 **Página de Inicio**: Hero section atractivo con call-to-action
- 📱 **Catálogo de Productos**: Visualización interactiva de muebles con imágenes
- 🔍 **Vista de Detalles**: Información completa de cada producto
- 🛒 **Carrito de Compras**: Sistema completo de agregar/quitar/gestionar productos
- 📞 **Formulario de Contacto**: Sistema de contacto con validación
- 🧭 **Navegación SPA**: Navegación fluida entre secciones sin recarga

---

## 🚀 Instalación y Ejecución

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/TU_USUARIO/Hermanos-Jota-Muebleria-Sprint3-4.git
cd Hermanos-Jota-Muebleria-Sprint3-4
```

### 2️⃣ Instalar Dependencias del Backend

```bash
cd backend
npm install
```

### 3️⃣ Instalar Dependencias del Frontend

```bash
cd ../client
npm install
```

### 4️⃣ Ejecutar el Proyecto

#### Iniciar el Backend (Puerto 3000)

```bash
# Desde la carpeta backend
npm run dev
```

El servidor backend estará disponible en: `http://localhost:3000`

- **API de bienvenida**: http://localhost:3000
- **API productos**: http://localhost:3000/api/productos
- **Imágenes**: http://localhost:3000/images/

#### Iniciar el Frontend (Puerto 5173)

```bash
# Desde la carpeta client (en otra terminal)
npm run dev
```

La aplicación frontend estará disponible en: `http://localhost:5173`

### 📌 Comandos Rápidos

#### Opción 1: Dos terminales separadas

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

#### Opción 2: Una sola terminal (Windows PowerShell)

```powershell
# Ejecutar backend en ventana separada y frontend en terminal actual
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" ; Start-Sleep -Seconds 3 ; cd client ; npm run dev
```

### 🔧 Tecnologías Utilizadas

#### Backend

- **Node.js**: Runtime de JavaScript
- **Express.js**: Framework web minimalista
- **Middleware personalizado**: Logging y manejo de errores

#### Frontend

- **React 18**: Biblioteca de interfaz de usuario
- **Vite**: Herramienta de build rápida
- **CSS**: Estilos personalizados con efectos y responsividad
- **Fetch API**: Comunicación con el backend

### 🎯 Decisiones de Arquitectura

#### **1. Separación Backend/Frontend**

- **Ventaja**: Escalabilidad y mantenimiento independiente
- **Implementación**: APIs REST para comunicación

#### **2. Single Page Application (SPA)**

- **Ventaja**: Navegación fluida sin recargas
- **Implementación**: Estado global en React con useState

#### **3. Componentes Reutilizables**

- **Ventaja**: Código modular y mantenible
- **Implementación**: Componentes especializados (Nav, Footer, TarjetaProductos, etc.)

#### **4. Estado Local vs Global**

- **Decisión**: Estado centralizado en App.jsx
- **Razón**: Simplicidad para el alcance del proyecto

#### **5. API RESTful**

- **Endpoints**:
  - `GET /api/productos` - Lista todos los productos
  - `GET /api/productos/:id` - Obtiene producto específico
- **Ventaja**: Estándar de la industria, fácil de consumir

#### **6. Manejo de Imágenes**

- **Decisión**: Servir imágenes estáticas desde el backend
- **Ruta**: `/images/nombre-imagen.png`
- **Ventaja**: Centralización de recursos y control de acceso

---

---

## 📊 Consigna Final - Sprint 3 y 4 - NEXUS

### ✅ Requisitos Técnicos Implementados

- **Backend API REST** con Node.js y Express
- **Frontend SPA** con React y Vite
- **Base de datos** simulada con archivos JSON
- **Sistema de enrutamiento** y navegación
- **Arquitectura modular** y escalable
- **Manejo de estados** y componentes reutilizables

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

---

## 🚀 URLs de la Aplicación

Una vez ejecutados ambos servidores:

### 🖥️ Frontend (Interfaz de Usuario)

- **Aplicación principal**: http://localhost:5173
- **Navegación disponible**: Inicio, Productos, Contacto, Carrito

### 🔌 Backend (API REST)

- **API de bienvenida**: http://localhost:3000
- **Lista de productos**: http://localhost:3000/api/productos
- **Producto específico**: http://localhost:3000/api/productos/1
- **Imágenes**: http://localhost:3000/images/aparador-uspallata.png
