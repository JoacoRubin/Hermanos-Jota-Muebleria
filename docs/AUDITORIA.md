# Auditoría de seguridad y calidad

Registro de los hallazgos detectados sobre la versión 1.0 del proyecto y de
cómo se resolvió cada uno. Sirve como historia del "por qué" de varias
decisiones que, sin contexto, parecen arbitrarias.

**Estado: 33 hallazgos numerados resueltos** (6 críticos, 6 altos, 10 bugs
funcionales, 11 de calidad), más la lista de higiene del final.

---

## 🔴 Críticos

### C1 · El CRUD de productos no tenía autenticación

`POST`, `PUT` y `DELETE` de `/api/productos` estaban abiertos a internet.
Cualquiera podía vaciar el catálogo con tres líneas de `curl`. El frontend
tenía un `<ProtectedRoute>`, pero el frontend corre en la máquina del atacante.

**Resuelto** — `authMiddleware` + `requireRole('admin')` en las tres rutas
(`backend/src/routes/productos.routes.js`). Cubierto por 4 tests de regresión.

### C2 · Segundo camino público al mismo CRUD

`app.use('/admin/crear-producto', productosRoutes)` montaba el router entero
—incluido el `DELETE`— en una segunda URL pública que el frontend nunca usó.

**Resuelto** — alias eliminado.

### C3 · Manipulación de precios

El total se calculaba en el servidor, pero con los precios que mandaba el
navegador: se podía comprar un aparador de $210.000 por $1.

**Resuelto** — el cliente sólo puede enviar `producto` y `cantidad`; el schema
de zod rechaza cualquier otro campo. Nombre, precio e imagen se leen de la base
dentro de `createOrder` (`backend/src/controllers/orders.controller.js`).

### C4 · `JWT_SECRET` publicado en el README

Estaba en un repositorio público, lo que permitía firmar tokens válidos para
cualquier usuario.

**Resuelto** — eliminado del README; el procedimiento de rotación y purga del
historial de git está en `docs/DEPLOY.md`, sección 2.
**Requiere acción manual:** rotar el secreto y reescribir el historial.

### C5 · Fallback de secreto hardcodeado

`process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'` hacía que
la app arrancara normalmente aunque faltara la variable, firmando tokens con un
string publicado en GitHub.

**Resuelto** — `backend/src/config/env.js` valida el entorno con zod y **lanza
al arranque** si falta algo. Exige además 32 caracteres mínimos y que
`JWT_SECRET` y `JWT_REFRESH_SECRET` sean distintos.

### C6 · CORS aceptaba cualquier origen

La rama `else` de la whitelist llamaba igual a `callback(null, true)`. Además
`NODE_ENV` no se seteaba en ningún lado, así que la condición
`NODE_ENV !== 'production'` era verdadera **en producción**.

**Resuelto** — rechazo real con `ApiError.forbidden`, orígenes desde
`CORS_ORIGINS`, y los de desarrollo sólo cuando `NODE_ENV !== 'production'`.

---

## 🟠 Altos

| # | Hallazgo | Resolución |
| --- | --- | --- |
| A1 | Sin rate limiting: login abierto a fuerza bruta | `express-rate-limit`: 10 intentos fallidos / 15 min en auth, 30 escrituras / min, 300 req / 15 min general |
| A2 | Sin `helmet` ni sanitización de queries | `helmet` + sanitizador propio que elimina claves con `$` o `.` en body, query y params |
| A3 | Mass assignment y operator injection en el update de productos | Schemas de zod en modo `.strict()` + `runValidators: true` en el update |
| A4 | Tokens de 30 días en `localStorage` | Access token de 15 min **en memoria** + refresh token de 7 días en cookie `httpOnly`, con rotación y detección de reutilización |
| A5 | Sin control de stock: se vendía lo que no había | Reserva atómica con `findOneAndUpdate({ stock: { $gte: cantidad } }, { $inc: … })` y compensación si algo falla |
| A6 | Los ítems del pedido no se validaban contra la base | `reservarStock` verifica existencia y disponibilidad de cada producto |

### Sobre A4: por qué el token va en memoria

`localStorage` es legible por cualquier JavaScript de la página. Un XSS se
llevaba un token con 30 días de vida útil, sin refresh, sin revocación y sin
forma de cerrar esa sesión. Ahora el access token vive en una variable de módulo
(`client/src/services/apiClient.js`), dura 15 minutos y el refresh viaja en una
cookie que el JavaScript no puede leer. Si un refresh token se reutiliza —señal
de robo— se revocan **todas** las sesiones del usuario.

### Sobre A5: por qué reserva atómica y no transacción

La condición viaja dentro del update, así que MongoDB garantiza que leer y
escribir el documento es atómico: dos personas comprando la última butaca no
pueden ganar las dos. Se prefirió esto a una transacción porque funciona
también contra un MongoDB standalone, sin exigir replica set.

---

## 🐛 Bugs funcionales

| # | Síntoma | Causa | Resolución |
| --- | --- | --- | --- |
| B1 | `GET /api/orders/:id` devolvía 403 **siempre**, hasta al dueño | `req.user.id` era un `ObjectId` y se comparaba con `!==` contra un string | `req.user.id = user._id.toString()` |
| B2 | El formulario de admin nunca pudo crear un producto | Mandaba `name`/`price`/`image`; el schema espera `nombre`/`precio`/`imagenUrl` | Formulario alineado al contrato + `categoria` agregada al modelo |
| B3 | El carrito se compartía entre usuarios del mismo navegador | La clave usaba `user._id`, campo que la API nunca devolvió → `cart_undefined` | Clave por `user.id`, y recarga al cambiar de sesión |
| B4 | Todos los pedidos mostraban "Invalid Date" | Leía `order.fechaPedido`; el schema usa `timestamps` → `createdAt` | Campo corregido + `formatearFecha` tolerante a valores inválidos |
| B5 | El botón de eliminar producto no aparecía nunca | `user?.rol === 'admin'` — `rol` sin `e`, y el optional chaining lo ocultaba | Se usa el booleano `isAdmin` del contexto |
| B6 | La validación de sesión del carrito no corría nunca | `if (!isAuthenticated)` sobre una **función**, siempre truthy | `isAuthenticated` ahora es un booleano: el bug no se puede escribir |
| B7 | Cualquier usuario registrado entraba al panel de admin | `ProtectedRoute` sólo miraba si había sesión | `<ProtectedRoute requireRole="admin">` |
| B8 | El seed importaba un archivo de dentro de `client/` | Rompía al desplegar el backend solo; además cruzaba ESM con CJS | Datos movidos a `backend/src/data/products.seed.js` |
| B9 | Riesgo de pedidos duplicados | `fetchWithRetry` reintentaba también los `POST` | Sólo se reintentan métodos idempotentes (`GET`, `HEAD`) |
| B10 | Fallback silencioso a datos mock ante cualquier error | El `catch` tragaba hasta un 500 y devolvía productos de ejemplo con IDs inexistentes | Eliminado: los errores se muestran |

---

## 🟡 Calidad y arquitectura

| # | Hallazgo | Resolución |
| --- | --- | --- |
| M1 | Cero tests | 42 tests de integración con `node:test` + `supertest` + MongoDB en memoria |
| M2 | Sin capa de validación | `zod` en el borde de cada endpoint (`backend/src/schemas/`) |
| M3 | Contratos inconsistentes entre API y cliente | `backend/src/serializers/` como única fuente de verdad; el id público siempre es `id` |
| M4 | Respuestas con formas distintas por endpoint | Envelope único: `{ data, meta }` / `{ message, data }` / `{ message, errors }` |
| M5 | Sin paginación en ningún listado | Paginación con techo de 100 ítems en productos y pedidos |
| M6 | `Cart.jsx`: 280 líneas con estilos inline, lógica y fetching juntos | Dividido en `CartItem`, `CheckoutForm` y un container flaco; estilos en `styles/components.css` |
| M7 | `alert()` y `window.confirm()` (12 usos) | `UIContext` con toasts y un diálogo accesible (foco atrapado, Escape, ARIA) |
| M8 | `console.log` verboso en producción | Eliminados; lo que queda está detrás de `import.meta.env.DEV` |
| M9 | `Navbar.jsx` era código muerto | Eliminado |
| M10 | Error handler declarado antes de una ruta, sin 404 | `notFoundHandler` y luego el error handler, ambos al final |
| M11 | Mensajes de error internos filtrados al cliente | Sólo se exponen los `ApiError` deliberados; el resto es "Error interno del servidor" |

---

## ⚪ Higiene

- Mongoose 7 → 8, Vite 4 → 5, ESLint 8 → 9 (flat config en ambos paquetes)
- Plantilla de entorno documentada en `docs/DEPLOY.md`
- `vercel.json` eliminado: el proyecto se despliega en Netlify
- README corregido (decía `npm run dev` desde la raíz, donde no hay `package.json`)
- `keepalive.yml`: falla si falta el secret en vez de pinguear un dominio ajeno; franja horaria acotada (~3.100 → ~1.300 ejecuciones/mes)
- CI con lint + tests + build en `.github/workflows/ci.yml`
- Formulario de contacto: ya no simula un envío que nunca ocurría; abre el cliente de correo
- Apagado ordenado ante `SIGTERM` (Render lo manda en cada deploy)
- Enumeración de usuarios mitigada: mismo mensaje y mismo tiempo de respuesta exista o no el email
- bcrypt de 10 a 12 rounds; política de contraseñas de 8 caracteres con letra y número **sólo en el registro**, para no dejar afuera a los usuarios creados con la regla vieja

---

## Las dos causas de fondo

**1. Se confundió "protegido en la UI" con "protegido".** `ProtectedRoute`, el
link de admin oculto, el botón deshabilitado por stock, el chequeo de sesión en
el carrito: todas defensas del lado del cliente sobre un servidor que no
validaba nada. El cliente corre en la máquina del atacante, siempre.

**2. No había contrato.** `id`/`_id`, `role`/`rol`, `createdAt`/`fechaPedido`,
`nombre`/`name`: cuatro bugs distintos, una sola causa. Backend y frontend
hablando idiomas parecidos pero no iguales, con optional chaining tragándose
los errores en silencio. Los serializers y los schemas existen para que esa
clase de bug deje de ser posible.

---

## Segunda pasada

Dos de los cuatro pendientes se completaron después:

### Tests de frontend

30 tests con Vitest + Testing Library sobre `CartContext`, `ProtectedRoute`,
`apiClient` y los helpers de formato. Cubren las regresiones de B3, B4, B7 y B9.

**Encontraron un bug real en el código nuevo del carrito**, que vale la pena
dejar registrado porque es exactamente para lo que sirven los tests:

- Al montar el provider con sesión ya iniciada, el estado inicial se leía con la
  clave de invitado. El carrito guardado nunca se recuperaba y el efecto de
  persistencia lo borraba con la lista vacía.
- Al cambiar de usuario **sin desmontar** (login o logout con la app abierta),
  el efecto de persistencia corría con los ítems del usuario anterior y la clave
  del nuevo: volvía a filtrar el carrito, que era justo lo que B3 arreglaba.

Resuelto guardando ítems y clave en un mismo estado y sincronizándolo durante el
render (el patrón que documenta React para ajustar estado cuando cambia una
entrada), en vez de coordinar dos efectos.

### Endpoint de contacto

`POST /api/contacto` (público, 5 consultas por hora y por IP), más
`GET /api/contacto` y `PUT /api/contacto/:id/estado` para administración. Las
consultas se persisten en la colección `contactmessages`. El formulario ya no
finge un envío: si falla, lo dice. 10 tests propios.

---

## Pendiente

- **Rotar `JWT_SECRET` y purgar el historial de git.** Requiere acceso al
  repositorio. Es lo más urgente que queda y no se puede hacer desde el código.
- **Importes en centavos.** Hoy los precios son números en coma flotante, con
  redondeo a dos decimales al calcular totales. Con precios enteros en pesos no
  se rompe nada; el día que haya decimales o descuentos porcentuales conviene
  guardar centavos como enteros. **No se hizo a propósito:** exige migrar los
  datos ya cargados en producción (productos y pedidos históricos), y esa es una
  decisión con consecuencias que corresponde tomar a quien administra la base,
  no algo para colar en una refactorización.
- **Envío real de mails.** Las consultas se guardan pero no se notifican. Con un
  proveedor configurado se agrega el envío en `contact.controller.js` y el resto
  del flujo queda igual.
