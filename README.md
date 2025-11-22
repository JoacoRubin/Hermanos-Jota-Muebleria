# 🪑 Mueblería Hermanos Jota - E-commerce Full Stack

## 👥 Integrantes del Proyecto
Joaquin Rubinstein
Andres Suarez
Gonzalo Ruiz
Guillermo Villalba

---

## 📋 Descripción del Proyecto

**Mueblería Hermanos Jota** es una aplicación web de e-commerce desarrollada para la venta de muebles premium. El proyecto implementa una arquitectura Full Stack con Node.js/Express en el backend y React/Vite en el frontend, ofreciendo una experiencia de usuario completa con autenticación, carrito de compras y gestión de pedidos.

### ✨ Funcionalidades Sprint 7 y 8
- 🔐 **Sistema de Autenticación**: Registro y login con JWT
- 👤 **Perfiles de Usuario**: Vista de perfil con información del usuario
- 🛒 **Carrito de Compras**: Sistema completo con checkout
- 📦 **Gestión de Pedidos**: Crear y visualizar historial de pedidos
- 🔒 **Rutas Protegidas**: Frontend y backend con middleware JWT
- 👨‍💼 **Panel de Admin**: Crear y gestionar productos
- 🗄️ **MongoDB Atlas**: Base de datos en la nube
- 🌐 **Desplegable**: Configurado para producción en Render/Netlify

## 🚀 Instalación y Ejecución Local

### 1️⃣ Clonar el Repositorio
```bash
git clone https://github.com/JoacoRubin/Hermanos-Jota-Muebleria.git
cd Hermanos-Jota-Muebleria
```

### 2️⃣ Configurar Variables de Entorno

#### Backend (`backend/.env`)
Crea el archivo `.env` en la carpeta `backend` y agrega:
```
MONGO_URI=mongodb+srv://<usuario>:<contraseña>@cluster0.jo6svin.mongodb.net/?appName=Cluster0
JWT_SECRET=hermanos-jota-secret-key-2024-jwt-super-secure
PORT=5000
```
- Reemplaza `<usuario>` y `<contraseña>` por tus credenciales de MongoDB Atlas.

#### Frontend (`client/.env.local`)
Crea el archivo `.env.local` en la carpeta `client` y agrega:
```
VITE_API_URL=http://localhost:5000
```

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
- **React Router DOM**: Navegación SPA profesional
- **Context API**: Gestión de estado global (Auth, Cart)

#### Seguridad y Autenticación
- **JWT (JSON Web Tokens)**: Autenticación segura
- **bcrypt**: Encriptación de contraseñas
- **Middleware de autenticación**: Protección de rutas

---

## 🌐 Despliegue en Producción

### Backend en Render

1. **Crear cuenta en [Render.com](https://render.com)**
2. **Crear nuevo Web Service**:
   - Conecta tu repositorio de GitHub
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Configurar variables de entorno**:
   ```
   MONGO_URI=tu_cadena_mongodb_atlas
   JWT_SECRET=hermanos-jota-secret-key-2024-jwt-super-secure
   PORT=5000
   ```
4. **Deploy** - Render generará una URL como: `https://hermanos-jota-backend.onrender.com`

### Frontend en Netlify

1. **Crear cuenta en [Netlify.com](https://netlify.com)**
2. **Conectar repositorio de GitHub**
3. **Configurar build**:
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`
4. **Agregar variable de entorno**:
   ```
   VITE_API_URL=https://hermanos-jota-backend.onrender.com
   ```
5. **Deploy** - Netlify generará una URL como: `https://hermanos-jota.netlify.app`

### Alternativa: Frontend en Vercel

1. **Crear cuenta en [Vercel.com](https://vercel.com)**
2. **Importar proyecto de GitHub**
3. **Configurar**:
   - Framework Preset: Vite
   - Root Directory: `client`
   - Variable de entorno: `VITE_API_URL=https://hermanos-jota-backend.onrender.com`
4. **Deploy**

---

## 🚀 URLs de la Aplicación

### 🖥️ Desarrollo Local
- **Frontend**: http://localhost:3000 (o 3001)
- **Backend API**: http://localhost:5000
- **API Productos**: http://localhost:5000/api/productos
- **API Auth**: http://localhost:5000/api/auth
- **API Orders**: http://localhost:5000/api/orders

### 🌐 Producción
- **Frontend**: https://vermillion-gnome-5f2469.netlify.app
- **Backend API**: https://hermanos-jota-muebleria-1.onrender.com
- **API Productos**: https://hermanos-jota-muebleria-1.onrender.com/api/productos
- **MongoDB**: MongoDB Atlas (configurado y funcionando)

---

## Estructura del Proyecto

```
Hermanos-Jota-Muebleria/
├── backend/
│   ├── package.json
│   ├── .env
│   ├── README.md
│   └── src/
│       ├── app.js
│       ├── seed.js
│       ├── controllers/
│       │   ├── productos.controller.js
│       │   ├── auth.controller.js
│       │   └── orders.controller.js
│       ├── models/
│       │   ├── Product.js
│       │   ├── User.js
│       │   └── Order.js
│       ├── middleware/
│       │   └── auth.js
│       └── routes/
│           ├── productos.routes.js
│           ├── auth.routes.js
│           └── orders.routes.js
├── client/
│   ├── package.json
│   ├── .env.local
│   ├── .env.example
│   ├── README.md
│   ├── vercel.json
│   ├── public/
│   │   ├── _redirects
│   │   └── images/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── ModernLayout.jsx
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── FormCreateProduct.jsx
│       ├── contexts/
│       │   ├── CartContext.jsx
│       │   └── AuthContext.jsx
│       ├── data/
│       │   └── mockProducts.js
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Products.jsx
│       │   ├── ProductDetail.jsx
│       │   ├── Cart.jsx
│       │   ├── Contact.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Profile.jsx
│       │   └── MisPedidos.jsx
│       └── services/
│           ├── productService.js
│           ├── authService.js
│           └── orderService.js
├── README.md
└── package.json




