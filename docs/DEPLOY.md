# Despliegue y configuración

Reemplaza a `SOLUCION_CORS.md` y `OPTIMIZACION_RENDER.md`, que quedaron obsoletos:
el primero documentaba una configuración de CORS que aceptaba **cualquier**
origen, y el segundo describía un cliente HTTP que ya no existe.

---

## 1. Variables de entorno del backend

Creá `backend/.env` con este contenido. **Nunca** lo subas al repositorio.

```dotenv
NODE_ENV=development
PORT=5000

# Cadena de conexión de MongoDB Atlas.
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/hermanos-jota?retryWrites=true&w=majority

# Firma de los access tokens. Mínimo 32 caracteres.
JWT_SECRET=

# Firma de los refresh tokens. DEBE ser distinta de JWT_SECRET:
# si fueran iguales, un access token robado serviría también como refresh.
JWT_REFRESH_SECRET=

ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7

# Orígenes permitidos por CORS, separados por coma.
# En desarrollo se agregan solos localhost:3000, :5173 y :5174.
# En producción SOLO se acepta lo que esté acá.
CORS_ORIGINS=https://vermillion-gnome-5f2469.netlify.app

# Opcional: cuenta de administrador para `npm run seed:admin`.
# Sin esto no hay forma de crear un admin: el registro siempre crea rol "user".
SEED_ADMIN_NOMBRE=Administrador
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=

# Opcional: microservicio RAG que responde el asistente del sitio.
# En desarrollo, si se omite, apunta solo a http://localhost:8000.
# En producción hay que setearla o el asistente devuelve 503.
RAG_API_URL=https://rag-api-505192322875.southamerica-east1.run.app

# ── Recuperación de contraseña ───────────────────────────────────────────
# Base del link que va en el mail. Apunta al FRONTEND, no a la API.
# Si se omite: en desarrollo cae a http://localhost:5173, en producción usa
# el primer origen de CORS_ORIGINS.
APP_URL=https://vermillion-gnome-5f2469.netlify.app

# Cuánto vive el token de recuperación. Default 60.
PASSWORD_RESET_TTL_MINUTES=60

# Proveedor de mail: "console" imprime el mail en el log, "noop" lo descarta.
# NO HAY PROVEEDOR REAL CONFIGURADO todavía — ver docs/MAIL.md.
# Default: "console" en desarrollo, "noop" en producción. No pongas "console"
# en producción: dejaría links de recuperación en los logs.
MAIL_DRIVER=noop
```

Generá cada secreto con un valor aleatorio **distinto**:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> El servidor **no arranca** si falta una variable crítica o si los dos secretos
> son iguales. Es deliberado: un servidor caído se detecta en minutos, uno que
> arrancó con un secreto por defecto se detecta cuando ya es tarde.

### Frontend

`client/.env.local`:

```dotenv
VITE_API_URL=http://localhost:5000
```

---

## 2. Rotación de secretos — hacelo antes que nada

El `JWT_SECRET` anterior estaba publicado en el README de un repositorio
público. Mientras siga en uso, cualquiera puede firmar un token válido para
cualquier usuario.

1. Generá secretos nuevos con el comando de arriba.
2. Cargalos en Render (**Environment**) y en tu `.env` local.
3. Verificá que ya no queden en el README (hecho) **ni en el historial de git**:

```bash
# Buscar el secreto viejo en todo el historial
git log -S 'hermanos-jota-secret-key-2024-jwt-super-secure' --oneline

# Si aparece, hay que reescribir el historial (git-filter-repo o BFG)
# y forzar el push. Coordinalo con el equipo: reescribe los hashes.
```

Al rotar los secretos, todas las sesiones activas se invalidan y los usuarios
tienen que volver a iniciar sesión. Es lo esperado.

---

## 3. Render (backend)

| Opción | Valor |
| --- | --- |
| Root Directory | `backend` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Node Version | 20 |

Variables de entorno a cargar: todas las de la sección 1, con
`NODE_ENV=production`.

**`NODE_ENV=production` no es opcional.** Sin esa variable el backend se
comporta como si estuviera en desarrollo: acepta orígenes de localhost,
manda cookies sin `Secure` y no aplica el cache del catálogo.

### Cookies entre dominios

El frontend (Netlify) y la API (Render) son sitios distintos, así que la cookie
del refresh token viaja con `SameSite=None; Secure`. Eso exige:

- HTTPS en los dos lados (Render y Netlify lo dan por defecto);
- `CORS_ORIGINS` con el origen **exacto** del frontend, sin barra final;
- `credentials: 'include'` en el cliente (ya está en `apiClient.js`).

Si al iniciar sesión el usuario queda deslogueado al refrescar la página, casi
siempre es que `CORS_ORIGINS` no coincide exactamente con el origen real.

---

## 4. Netlify (frontend)

| Opción | Valor |
| --- | --- |
| Base directory | `client` |
| Build command | `npm run build` |
| Publish directory | `client/dist` |

Variable de entorno: `VITE_API_URL=https://<tu-backend>.onrender.com`

El archivo `client/public/_redirects` ya maneja el ruteo SPA. Se eliminó
`vercel.json`: el proyecto se despliega en Netlify y tener las dos
configuraciones sólo generaba confusión.

---

## 5. Carga inicial de datos

```bash
cd backend

npm run seed              # carga el catálogo si la colección está vacía
npm run seed -- --force   # borra y recarga (bloqueado si NODE_ENV=production)
npm run seed:admin        # crea o promueve el admin definido en el .env
```

El seed **ya no borra la base por defecto**. La versión anterior hacía
`deleteMany({})` sin preguntar: correrlo por costumbre contra producción se
llevaba puesto el catálogo real.

---

## 6. Cold start de Render

El plan gratuito duerme el servicio a los 15 minutos de inactividad y el primer
request después puede tardar hasta un minuto.

Lo que hay hecho:

- `.github/workflows/keepalive.yml` pinguea `/health` cada 14 minutos dentro de
  la franja horaria de uso. Requiere el secret `RENDER_URL`. Si el secret falta,
  el workflow **falla** en vez de fingir que funcionó.
- `apiClient.js` reintenta los `GET` con timeouts largos y avisa en pantalla que
  el servidor puede estar arrancando.
- Los `POST` **no** se reintentan nunca: un reintento sobre un pedido que ya
  llegó al servidor lo duplica.

La solución de fondo es un plan pago o un hosting que no duerma. El keepalive es
un parche, y conviene tenerlo claro.

---

## 7. Checklist antes de publicar

- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` nuevos, distintos entre sí y fuera del repo
- [ ] Secreto viejo purgado del historial de git
- [ ] `NODE_ENV=production` cargado en Render
- [ ] `CORS_ORIGINS` con el origen exacto del frontend
- [ ] `VITE_API_URL` apuntando al backend correcto en Netlify
- [ ] Secret `RENDER_URL` cargado en GitHub Actions
- [ ] `RAG_API_URL` cargada en Render si querés el asistente activo
- [ ] `npm test` y `npm run lint` en verde en los dos paquetes
- [ ] Un usuario admin creado con `npm run seed:admin`

---

## 8. El asistente (RAG)

El widget 💬 vive en `ModernLayout`, así que aparece en **todas** las páginas sin
tocar ninguna.

El circuito es: widget React → `POST /api/asistente` (tu Express) → `/ask` del
microservicio RAG → modelo. El navegador **nunca** habla con el RAG ni ve su URL
ni ninguna API key: Express hace de gateway (patrón BFF). Por eso el asistente
hereda gratis el CORS, el rate limiting y el manejo de errores de la API.

| Situación | Qué pasa |
| --- | --- |
| `RAG_API_URL` sin setear en producción | `503` — el asistente avisa que no está disponible |
| RAG caído o con error | `502` — mensaje genérico; el detalle queda solo en los logs |
| Pregunta < 3 o > 500 caracteres | `400` antes de gastar una llamada al modelo |
| Campo extra en el body | `400` — el schema es `.strict()` |

Que falte `RAG_API_URL` **no impide arrancar el servidor**: el asistente es una
función accesoria, no crítica. El resto del sitio funciona igual.
