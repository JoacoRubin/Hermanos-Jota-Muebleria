# 🪑 Mueblería Hermanos Jota — E-commerce Full Stack

---

## 📋 Descripción

Aplicación de e-commerce para la venta de muebles premium. Backend en
Node.js/Express con MongoDB, frontend en React/Vite.

### Funcionalidades

- 🔐 Autenticación con access token corto + refresh token rotativo en cookie `httpOnly`
- 👤 Perfiles de usuario y roles (`user` / `admin`)
- 🛒 Carrito de compras por usuario
- 📦 Pedidos con validación de stock y precios calculados en el servidor
- 🔄 Flujo de estados `pendiente → aceptado → despachado → entregado` (+ `cancelado`), con transiciones validadas en un único lugar e historial de quién cambió qué y cuándo
- 🚚 Seguimiento para el cliente con línea de tiempo y pestañas *Pendientes / Entregados / Cancelados*
- ↩️ Cancelación con reingreso de stock **exactamente una vez**, protegida contra doble ejecución
- 🙈 El stock exacto **no sale de la API** para el cliente: solo `stockStatus` y el aviso *"Últimas N unidades"*, calculados en el servidor
- 📊 Reposición de stock que **suma** unidades (`$inc`) y libro mayor auditable de cada movimiento
- 🔑 Recuperación de contraseña con token hasheado, de un solo uso y con vencimiento
- 🔒 Rutas protegidas por sesión y por rol, en frontend **y** backend
- 👨‍💼 Panel de administración: productos, stock y pedidos
- ✉️ Formulario de contacto con persistencia y bandeja para administradores
- 🗄️ MongoDB Atlas
- ✅ 188 tests automatizados (144 en la API + 44 en el frontend)

---

## 🚀 Puesta en marcha

### 1. Clonar

```bash
git clone https://github.com/JoacoRubin/Hermanos-Jota-Muebleria.git
cd Hermanos-Jota-Muebleria
```

### 2. Variables de entorno

Seguí **[docs/DEPLOY.md](docs/DEPLOY.md)** para crear `backend/.env` y
`client/.env.local`.

> ⚠️ Este README **ya no contiene secretos**. La versión anterior publicaba el
> `JWT_SECRET` real en un repositorio público, lo que permitía a cualquiera
> firmar tokens válidos para cualquier usuario. Si todavía no rotaste ese
> secreto, hacelo antes que nada: sección 2 de `docs/DEPLOY.md`.

### 3. Instalar dependencias

Son **dos paquetes independientes**. No hay `package.json` en la raíz.

```bash
cd backend && npm install
cd ../client && npm install
```

### 4. Cargar datos iniciales

```bash
cd backend
npm run seed          # catálogo de productos
npm run seed:admin    # usuario administrador (requiere SEED_ADMIN_* en .env)
```

### 5. Levantar el proyecto

Dos terminales:

```bash
# Terminal 1 — API en http://localhost:5000
cd backend && npm run dev

# Terminal 2 — Frontend en http://localhost:3000
cd client && npm run dev
```

---

## 🧪 Tests y calidad

```bash
cd backend
npm test          # 52 tests de integración (MongoDB en memoria)
npm run lint

cd ../client
npm test          # 30 tests con Vitest + Testing Library
npm run lint
npm run build
```

**Backend** — que el CRUD de productos exija rol admin, que el precio de un
pedido no se pueda manipular desde el cliente, que el stock se descuente de
forma atómica y se devuelva si algo falla, que un usuario no pueda ver pedidos
ajenos y que un refresh token no se pueda reutilizar.

**Frontend** — que el carrito no se filtre entre usuarios del mismo navegador,
que un `POST` nunca se reintente (duplicaría pedidos), que el refresh de sesión
sea de un solo vuelo y que una ruta de admin bloquee a un usuario común.

---

## 🏗️ Arquitectura

```
Hermanos-Jota-Muebleria/
├── backend/
│   ├── src/
│   │   ├── server.js            # arranque: valida entorno, conecta, escucha
│   │   ├── app.js               # la app Express (exportable, testeable)
│   │   ├── config/              # validación de entorno (fail-fast) y DB
│   │   ├── constants.js         # vocabulario del dominio
│   │   ├── schemas/             # validación de entrada con zod
│   │   ├── middleware/          # auth, validate, sanitize, rateLimit, errores
│   │   ├── models/              # schemas de Mongoose
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── serializers/         # única fuente de verdad de las respuestas
│   │   ├── utils/               # tokens, paginación, ApiError, asyncHandler
│   │   └── data/                # catálogo de seed
│   └── tests/
└── client/
    └── src/
        ├── services/            # apiClient + servicios por recurso
        ├── contexts/            # Auth, Cart, UI (toasts y diálogos)
        ├── components/          # ui/, cart/, products/
        ├── pages/
        ├── constants.js         # espejo del dominio del backend
        └── styles/
```

### Decisiones que conviene conocer

**El frontend no es una capa de seguridad.** `ProtectedRoute` evita que el
usuario llegue a una pantalla que igual le va a fallar; la autorización real
está en `requireRole('admin')` del backend. Hacen falta las dos, y no son
intercambiables.

**El precio lo pone el servidor.** Al crear un pedido, el cliente sólo manda
`producto` y `cantidad`. El nombre, el precio y la imagen se leen de la base.

**El access token vive en memoria.** Dura 15 minutos y nunca toca
`localStorage`. El refresh token va en una cookie `httpOnly` de 7 días, rota en
cada uso y, si se detecta reutilización, se revocan todas las sesiones del
usuario.

**Todo lo que entra se valida con zod, en modo estricto.** Un campo no
declarado hace fallar la petición. Eso es lo que elimina el mass assignment.

---

## 🔧 Tecnologías

**Backend** — Express 4 · Mongoose 8 · zod · jsonwebtoken · bcrypt · helmet ·
express-rate-limit · node:test + supertest + mongodb-memory-server

**Frontend** — React 18 · Vite 5 · React Router 6 · Context API · CSS propio ·
Vitest + Testing Library

---

## 🌐 URLs

| Entorno | Frontend | API |
| --- | --- | --- |
| Local | http://localhost:3000 | http://localhost:5000 |
| Producción | https://vermillion-gnome-5f2469.netlify.app | https://hermanos-jota-muebleria-1.onrender.com |

### Endpoints

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/productos` | Público (paginado, filtrable). El `stock` exacto **solo** si el token es de admin |
| GET | `/api/productos/:id` | Público (ídem) |
| POST | `/api/productos` | Admin |
| PUT | `/api/productos/:id` | Admin |
| POST | `/api/productos/:id/stock` | Admin — **suma** unidades, no las reemplaza |
| GET | `/api/productos/:id/movimientos` | Admin — libro mayor del inventario |
| DELETE | `/api/productos/:id` | Admin |
| POST | `/api/auth/register` | Público |
| POST | `/api/auth/login` | Público |
| POST | `/api/auth/refresh` | Cookie `httpOnly` |
| POST | `/api/auth/logout` | Público (idempotente) |
| POST | `/api/auth/forgot-password` | Público (5 por hora / IP) |
| POST | `/api/auth/reset-password` | Público (5 por hora / IP) |
| GET | `/api/auth/profile` | Autenticado |
| POST | `/api/orders` | Autenticado |
| GET | `/api/orders/mis-pedidos` | Autenticado (`?grupo=pendientes\|entregados\|cancelados`) |
| GET | `/api/orders/:id` | Dueño o admin |
| POST | `/api/orders/:id/cancelar` | Dueño (en estados cancelables) o admin |
| GET | `/api/orders/admin/all` | Admin |
| PUT | `/api/orders/:id/estado` | Admin |
| POST | `/api/contacto` | Público (5 por hora / IP) |
| GET | `/api/contacto` | Admin |
| PUT | `/api/contacto/:id/estado` | Admin |
| POST | `/api/asistente` | Público (20 cada 5 min / IP) |
| GET | `/health` | Público |

### Formato de respuesta

Consistente en toda la API. El identificador público siempre se llama `id`.

```jsonc
// Éxito con colección
{ "data": [ /* … */ ], "meta": { "page": 1, "limit": 20, "total": 11, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false } }

// Éxito con recurso
{ "message": "Pedido creado exitosamente", "data": { "id": "…" } }

// Error
{ "message": "Datos inválidos", "errors": [ { "field": "precio", "message": "El precio no puede ser negativo" } ] }
```

---

## 📄 Documentación adicional

- **[docs/DEPLOY.md](docs/DEPLOY.md)** — variables de entorno, rotación de
  secretos, Render, Netlify, cold start y checklist de publicación.
- **[docs/MAIL.md](docs/MAIL.md)** — cómo probar la recuperación de contraseña
  hoy y qué falta configurar para que el mail salga de verdad en producción.
- **[docs/ASISTENTE.md](docs/ASISTENTE.md)** — contrato con el microservicio
  RAG, por qué Express rehidrata los productos desde Mongo y qué queda abierto
  (autenticación del RAG, FAQ stateless vs. conversación contextual).
- **[docs/AUDITORIA.md](docs/AUDITORIA.md)** — auditoría de seguridad y calidad,
  con el detalle de cada hallazgo y cómo se resolvió.
