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
#
# ⚠️ EL NOMBRE DE LA BASE VA AL FINAL DE LA RUTA Y NO ES DECORATIVO: Mongo la
# crea sola con la primera escritura, así que un typo no da error — te deja
# trabajando en una base vacía que nadie mira.
#
# Estado verificado al 2026-07-27: los datos de la aplicación viven en
# `hermanos-jota-dev`, y esa misma base es la que sirve producción. La base
# `hermanos-jota` NO existe (cero colecciones). El valor autoritativo de
# producción es el que esté cargado en Render → Environment, no este ejemplo.
#
# Mientras dev y producción compartan base, cada prueba local escribe en la
# base que sirve al sitio publicado. Ver la sección 9.
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<nombre-de-la-base>?retryWrites=true&w=majority

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

# Opcional: secreto compartido con el RAG. Express lo manda como
# `Authorization: Bearer …` en cada consulta.
#
# ⚠️ Solo sirve si el microservicio lo VALIDA del otro lado. Si el servicio
# acepta invocaciones anónimas, el rate limiting de esta API es decorativo:
# cualquiera que descubra la URL le pega directo y quema la cuota del modelo.
# Revisá que Cloud Run NO tenga "allow unauthenticated invocations".
RAG_API_KEY=

# ── Recuperación de contraseña ───────────────────────────────────────────
# Base del link que va en el mail. Apunta al FRONTEND, no a la API.
#
# Si se omite: en desarrollo cae a http://localhost:3000 (el puerto que fija
# client/vite.config.js), en producción al primer origen de CORS_ORIGINS.
# En producción conviene setearla explícita igual: el día que alguien agregue
# un segundo origen al principio de la lista, los links del mail empiezan a
# apuntar al sitio equivocado y nadie se entera.
APP_URL=https://vermillion-gnome-5f2469.netlify.app

# Cuánto vive el token de recuperación. Default 60.
PASSWORD_RESET_TTL_MINUTES=60

# Proveedor de mail: "console" imprime el mail en el log, "noop" lo descarta,
# "brevo" envía de verdad.
# Default: "console" en desarrollo, "noop" en producción. No pongas "console"
# en producción: dejaría links de recuperación en los logs.
#
# Para activar el envío real (gratis, sin dominio propio) ver docs/MAIL.md.
# Con MAIL_DRIVER=brevo, estas dos son OBLIGATORIAS o el servidor no arranca:
MAIL_DRIVER=noop
BREVO_API_KEY=
MAIL_FROM=
MAIL_FROM_NOMBRE=Mueblería Hermanos Jota
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
| Node Version | la de `backend/.node-version` |

> **Build Command debe ser `npm ci`, no `npm install`.** `npm ci` instala
> exactamente lo que dice el lockfile; `npm install` puede resolver una
> dependencia transitiva distinta en producción que en tu máquina.

### La versión de Node está fijada, y hay una razón

`backend/.node-version` y `client/.node-version` son la **única** fuente de
verdad: los leen Render, Netlify y el CI (`node-version-file` en
`ci.yml`). Cambiar el número en un solo lugar alcanza para los tres.

No alcanza con el campo `engines` de `package.json`. Dice `>=20.6.0`, que no
tiene techo, así que Render instalaba "la más nueva que cumpla" — y durante
varios deploys **producción corrió Node 26 mientras la suite de tests corría
en Node 20**. Seis majors de diferencia sobre un código que usa `fetch`,
`AbortSignal.timeout` y el runner de tests nativo.

El problema de fondo no era la versión: era que un despliegue podía cambiar de
runtime solo, sin que nadie tocara nada.

Para subir de versión, hacelo deliberadamente: cambiás los dos archivos, corrés
la suite completa, y recién si pasa, deployás.

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

## 6. Cold start de Render (y del RAG)

El plan gratuito de Render duerme el servicio a los 15 minutos de inactividad, y
el RAG en Cloud Run escala a cero en la misma ventana. **Los dos cold starts se
suman**: medido en producción, una pregunta al asistente con ambos servicios
fríos tardó 34,5s — 13,4s del RAG y ~21s de Render.

Lo que hay hecho:

- **Cloud Scheduler** (GCP, `southamerica-east1`) pinguea el `/health` de los dos
  servicios cada 10 minutos. Entra en el free tier: 3 jobs por mes sin cargo.

  ```bash
  gcloud scheduler jobs list --location=southamerica-east1
  # rag-keepalive     */10 * * * *  ENABLED  → https://rag-api-...run.app/health
  # render-keepalive  */10 * * * *  ENABLED  → https://<backend>.onrender.com/health
  ```

  ⚠️ **Esta infraestructura NO está versionada en el repo**: vive solo en GCP. Si
  se recrea el proyecto de GCP hay que volver a crear los jobs a mano.

- `apiClient.js` reintenta los `GET` con timeouts largos y avisa en pantalla que
  el servidor puede estar arrancando.
- Los `POST` **no** se reintentan nunca: un reintento sobre un pedido que ya
  llegó al servidor lo duplica.

**Por qué no está en GitHub Actions.** Estuvo, en `.github/workflows/keepalive.yml`,
y se sacó con evidencia: los cron de GitHub son *best-effort* y en este repo
llegaban cada **58-71 minutos** con un cron de `*/10`. Con servicios que duermen a
los 15, eso no reduce nada — solo da sensación de cobertura. Cloud Scheduler, en
cambio, disparó a las `05:00:02Z` con un `*/10`: dos segundos de desvío.

La solución de fondo sigue siendo un plan pago o un hosting que no duerma (en
Cloud Run, `--min-instances=1`, que cobra la instancia idle). El keepalive es un
parche, y conviene tenerlo claro.

---

## 7. Checklist antes de publicar

- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` nuevos, distintos entre sí y fuera del repo
- [ ] Secreto viejo purgado del historial de git
- [ ] `NODE_ENV=production` cargado en Render
- [ ] `CORS_ORIGINS` con el origen exacto del frontend
- [ ] `APP_URL` en **Render** con la URL del frontend, sin barra final
      (ojo: es una variable del BACKEND aunque apunte al frontend — es Express
      quien arma el link del mail de recuperación)
- [ ] `VITE_API_URL` apuntando al backend correcto en Netlify
- [ ] Jobs de Cloud Scheduler creados y `ENABLED` (`gcloud scheduler jobs list
      --location=southamerica-east1`) — no están versionados, se recrean a mano
- [ ] Secrets `RENDER_URL` y `RAG_URL` **borrados** de GitHub Actions: quedaron
      huérfanos al eliminar `keepalive.yml`
- [ ] Migraciones corridas (las dos son idempotentes y simulan por defecto):
      `npm run migrate:001 -- --apply` (renombre de estados) y
      `npm run migrate:002 -- --apply` (saldo inicial del libro de stock)
- [ ] Decidido qué hacer con el mail: hoy `MAIL_DRIVER=noop` en producción
      significa que **la recuperación de contraseña no envía nada**
      (ver `docs/MAIL.md`)
- [ ] `RAG_API_URL` cargada en Render si querés el asistente activo
- [ ] `npm test` y `npm run lint` en verde en los dos paquetes
- [ ] Un usuario admin creado con `npm run seed:admin`

---

## 8. El asistente (RAG)

El widget 💬 se monta en `App.jsx`, hermano de `<Routes>`, así que aparece en
**todas** las páginas sin tocar ninguna.

Estuvo dentro de `ModernLayout` y hubo que sacarlo: como cada página renderiza
su propio `<ModernLayout>`, al navegar React desmontaba el widget entero y la
conversación se perdía en cada click del menú. Si vuelve a colgar de una
página, el bug vuelve con él — hay tests en
`client/src/components/AsistentePersistencia.test.jsx` que lo cazan.

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

El contrato con el microservicio y lo que queda abierto —autenticarlo, y
decidir si es una FAQ sin estado o una conversación con contexto— están en
**[docs/ASISTENTE.md](ASISTENTE.md)**.

---

## 9. Bases de datos: hoy hay una sola

Verificado el 2026-07-27: **desarrollo y producción comparten la base
`hermanos-jota-dev`** en el cluster de Atlas. La base `hermanos-jota` que este
documento usaba de ejemplo nunca se creó.

Consecuencia práctica: cada usuario de prueba, cada pedido de juguete y cada
mensaje de contacto que generes en local entra a la base que sirve al sitio
publicado. El nombre termina en `-dev`, pero no es un entorno aislado.

### Qué protege hoy

El camino destructivo grave está tapado: `npm run seed -- --force` se frena si
la base **no es local**, y exige el flag explícito `--si-es-remota`.

Esa guarda mira el host de la `MONGO_URI`, **no** `NODE_ENV`. Es a propósito:
`NODE_ENV` describe cómo arrancó el proceso, no a qué base se le escribe, así
que un script corrido a mano contra Atlas con `NODE_ENV=development` pasaba
cualquier `if (isProduction)` y borraba datos reales.

### Cuándo hay que separarlas

**Antes del primer pedido de una persona real.**

Hasta ahí, separar es gratis: los 11 productos y el admin se regeneran con
`npm run seed` y `npm run seed:admin`, así que no hay nada que migrar. Después,
pasa a ser una migración con datos de un cliente adentro.

Cómo hacerlo, cuando toque:

```powershell
# 1. Render → Environment → MONGO_URI, cambiar el nombre a hermanos-jota-prod
# 2. Sembrar la base nueva
$env:MONGO_URI="...la nueva de prod..."
npm run seed
npm run seed:admin
Remove-Item Env:\MONGO_URI

# 3. En backend/.env, apuntar a hermanos-jota-local y sembrarla igual
```

`hermanos-jota-dev` queda huérfana y se puede borrar desde Atlas.
