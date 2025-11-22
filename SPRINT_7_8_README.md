# 🔐 SPRINT 7 Y 8 - SISTEMA DE AUTENTICACIÓN IMPLEMENTADO

## ✨ Nuevas Funcionalidades Implementadas

### 🔒 Sistema de Autenticación Full Stack
- ✅ Registro de usuarios con validación
- ✅ Login con JWT (JSON Web Tokens)
- ✅ Persistencia de sesión con localStorage
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Middleware de protección de rutas en backend
- ✅ Rutas protegidas en frontend con ProtectedRoute
- ✅ Context API para gestión de estado global de autenticación
- ✅ Navbar dinámico que muestra usuario autenticado

### 🛡️ Seguridad Implementada
- Contraseñas hasheadas con bcrypt (salt rounds: 10)
- Tokens JWT con expiración de 30 días
- Validación de tokens en cada petición a rutas protegidas
- Verificación automática de sesión al recargar la página
- Cierre de sesión seguro con limpieza de localStorage

### 🎨 Interfaz de Usuario
- Páginas de Login y Registro con diseño moderno
- Mensajes de error y éxito claros
- Navegación condicional según estado de autenticación
- Redirección automática después del login
- Protección visual de rutas privadas

## 📁 Nuevos Archivos Creados

### Backend
```
backend/
├── src/
│   ├── models/
│   │   └── User.js                 # Modelo de usuario con bcrypt
│   ├── controllers/
│   │   └── auth.controller.js      # Lógica de autenticación
│   ├── middleware/
│   │   └── auth.js                 # Middleware JWT
│   └── routes/
│       └── auth.routes.js          # Rutas de autenticación
└── .env                            # Variables de entorno (JWT_SECRET)
```

### Frontend
```
client/src/
├── contexts/
│   └── AuthContext.jsx             # Context API para auth
├── services/
│   └── authService.js              # Servicio de API de auth
├── pages/
│   ├── Login.jsx                   # Página de inicio de sesión
│   └── Register.jsx                # Página de registro
└── components/
    └── ProtectedRoute.jsx          # Componente de protección
```

## 🚀 Cómo Usar el Sistema

### 1️⃣ Configurar Variables de Entorno

En `backend/.env` asegúrate de tener:
```env
MONGO_URI=tu_conexion_mongodb
PORT=5000
JWT_SECRET=tu-clave-secreta-super-segura
```

### 2️⃣ Iniciar el Backend
```bash
cd backend
npm start
```

### 3️⃣ Iniciar el Frontend
```bash
cd client
npm run dev
```

## 📝 Endpoints de API

### Autenticación (Sin token requerido)
- `POST /api/auth/register` - Registrar nuevo usuario
  ```json
  {
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "password": "123456"
  }
  ```

- `POST /api/auth/login` - Iniciar sesión
  ```json
  {
    "email": "juan@email.com",
    "password": "123456"
  }
  ```

### Rutas Protegidas (Token requerido en header)
- `GET /api/auth/profile` - Obtener perfil del usuario
- `GET /api/auth/verify` - Verificar validez del token

**Header requerido:**
```
Authorization: Bearer {tu-token-jwt}
```

## 🔐 Flujo de Autenticación

1. **Registro:**
   - Usuario completa formulario en `/registro`
   - Backend hashea la contraseña con bcrypt
   - Se guarda el usuario en MongoDB
   - Se genera un JWT y se devuelve al cliente
   - El token se guarda en localStorage
   - Usuario es redirigido a la página principal

2. **Login:**
   - Usuario ingresa credenciales en `/login`
   - Backend verifica email y contraseña
   - Si son correctos, genera y devuelve JWT
   - Token se guarda en localStorage
   - Usuario es redirigido a la ruta que intentaba acceder

3. **Sesión Persistente:**
   - Al cargar la app, AuthContext verifica si hay token
   - Si existe, valida el token con el backend
   - Si es válido, restaura la sesión del usuario
   - Si no es válido, limpia el localStorage

4. **Acceso a Rutas Protegidas:**
   - Usuario intenta acceder a ruta protegida (ej: `/carrito`)
   - ProtectedRoute verifica si está autenticado
   - Si no lo está, redirige a `/login`
   - Si lo está, permite el acceso

5. **Cierre de Sesión:**
   - Usuario hace click en "Cerrar Sesión"
   - Se limpia el localStorage
   - Estado de usuario se resetea
   - Navbar muestra opciones de Login/Registro

## 🎯 Rutas Protegidas

Las siguientes rutas requieren autenticación:
- `/carrito` - Ver y gestionar carrito de compras
- `/admin/crear-producto` - Crear nuevos productos

## 🧪 Probar el Sistema

### Opción 1: Crear Usuario Nuevo
1. Visita `http://localhost:3000/registro`
2. Completa el formulario de registro
3. Serás redirigido automáticamente al inicio
4. Verás tu nombre en la navbar

### Opción 2: Usuario de Prueba (si ya tienes uno)
1. Visita `http://localhost:3000/login`
2. Ingresa tus credenciales
3. Serás redirigido al inicio

### Probar Rutas Protegidas
1. Intenta acceder a `/carrito` sin estar autenticado
2. Serás redirigido a `/login`
3. Después de iniciar sesión, serás llevado al carrito

## 🛠️ Tecnologías Utilizadas

### Backend
- **bcrypt** - Hashing de contraseñas
- **jsonwebtoken** - Generación y verificación de JWT
- **Express middleware** - Protección de rutas

### Frontend
- **React Context API** - Gestión de estado global
- **localStorage** - Persistencia de sesión
- **React Router** - Navegación y protección de rutas

## 📊 Estructura de JWT

El token JWT contiene:
```json
{
  "id": "usuario_id_mongodb",
  "iat": 1234567890,
  "exp": 1237246290
}
```

## 🔒 Mejores Prácticas Implementadas

1. ✅ Contraseñas NUNCA se guardan en texto plano
2. ✅ Tokens con tiempo de expiración
3. ✅ Validación de email en el modelo
4. ✅ Mensajes de error genéricos para seguridad
5. ✅ Limpieza de datos sensibles en respuestas (método toJSON)
6. ✅ Verificación de tokens en cada petición protegida
7. ✅ Manejo de errores consistente
8. ✅ Variables de entorno para secretos

## 🚨 Notas de Seguridad

⚠️ **IMPORTANTE para Producción:**
- Cambiar `JWT_SECRET` por una clave aleatoria y segura
- Usar HTTPS en producción
- Implementar rate limiting en endpoints de auth
- Considerar refresh tokens para sesiones más largas
- Implementar logout en el backend (blacklist de tokens)

## 📚 Próximos Pasos Sugeridos

- [ ] Implementar "Olvidé mi contraseña"
- [ ] Agregar roles de usuario (admin, user)
- [ ] Proteger rutas de admin con middleware adicional
- [ ] Implementar refresh tokens
- [ ] Agregar OAuth (Google, Facebook)
- [ ] Sistema de verificación de email

## 🎓 Objetivos de Aprendizaje Cumplidos

✅ Implementar sistema completo de autenticación full stack
✅ Usar bcrypt para hashear contraseñas
✅ Generar y verificar JWT
✅ Crear middleware de autorización
✅ Gestionar estado global con Context API
✅ Proteger rutas en frontend y backend
✅ Persistir sesiones de usuario
✅ Manejar flujos de autenticación complejos

---

**¡El sistema de autenticación está completo y funcional!** 🎉

Para cualquier duda, revisa el código o contacta al equipo de desarrollo.
