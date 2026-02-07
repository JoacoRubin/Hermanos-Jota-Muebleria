# 🚀 Solución al Problema de Carga Lenta en Render

## ✅ Optimizaciones Implementadas

### 1. **Timeouts y Retry Logic en el Frontend**
   - Todas las peticiones fetch ahora tienen timeout de 30-60 segundos
   - Retry automático en caso de fallo (2-3 intentos)
   - Mejor manejo de errores y feedback al usuario

### 2. **Optimización de MongoDB**
   - Timeouts reducidos en conexión (5 segundos)
   - Pool de conexiones (2-10 conexiones activas)
   - Índices en modelo Product para consultas más rápidas

### 3. **Cache Headers**
   - Productos se cachean por 5 minutos en producción
   - Reduce carga en base de datos

### 4. **Health Check Endpoint**
   - Nuevo endpoint: `GET /health`
   - Útil para mantener el servicio activo

### 5. **GitHub Actions Keep-Alive** (⚠️ IMPORTANTE)
   - Evita que Render entre en "cold start"
   - Hace ping al servidor cada 14 minutos

---

## 📋 Pasos para Completar la Configuración

### Paso 1: Configurar GitHub Actions Keep-Alive

El archivo `.github/workflows/keepalive.yml` ya está creado, pero necesitas configurar tu URL de Render:

**Opción A: Usar GitHub Secrets (Recomendado)**

1. Ve a tu repositorio en GitHub: https://github.com/JoacoRubin/Hermanos-Jota-Muebleria
2. Click en **Settings** (Configuración)
3. En el menú lateral: **Secrets and variables** → **Actions**
4. Click en **New repository secret**
5. Agrega:
   - **Name**: `RENDER_URL`
   - **Value**: Tu URL de Render (ejemplo: `https://tu-app.onrender.com`)
6. Click en **Add secret**

**Opción B: Editar el archivo directamente**

Edita `.github/workflows/keepalive.yml` línea 15:

```yaml
# Antes:
RENDER_URL="${{ secrets.RENDER_URL || 'https://tu-app.onrender.com' }}"

# Después (reemplaza con tu URL real):
RENDER_URL="https://hermanos-jota-muebleria.onrender.com"
```

### Paso 2: Habilitar GitHub Actions

Si el repositorio es un fork o es la primera vez que usas Actions:

1. Ve a la pestaña **Actions** en GitHub
2. Si ves "Workflows aren't being run", click en **"I understand my workflows, go ahead and enable them"**

### Paso 3: Verificar que Funciona

1. Ve a **Actions** en GitHub
2. Deberías ver el workflow "Keep Render Service Alive"
3. Espera a que se ejecute automáticamente (cada 14 minutos)
4. O ejecuta manualmente:
   - Click en "Keep Render Service Alive"
   - Click en **Run workflow** → **Run workflow**

---

## 🎯 Resultados Esperados

### Antes de las Optimizaciones:
- ⏳ Primera carga: **5+ minutos**
- ⏳ Cargas subsecuentes: **30-60 segundos** (por cold start)

### Después de las Optimizaciones (sin keep-alive):
- ⚡ Primera carga con cold start: **30-45 segundos**
- ⚡ Cargas sin cold start: **2-5 segundos**

### Con GitHub Actions Keep-Alive Activo:
- 🚀 **< 2 segundos** (sin cold starts)
- 🚀 Respuesta instantánea

---

## 🔍 Diagnóstico de Problemas

### Si sigue tardando más de 60 segundos:

1. **Verifica los logs de Render:**
   - Ve a tu Dashboard de Render
   - Click en tu servicio
   - Ve a **Logs**
   - Busca líneas como:
     ```
     ✓ Conectado a MongoDB en XXXms
     [GET /api/productos] Completado en XXXms
     ```

2. **Interpreta los tiempos:**
   - Si "Conectado a MongoDB" > 5000ms → Problema con MongoDB Atlas
   - Si "Completado en" > 3000ms → Problema con consulta/índices
   - Si todo tarda > 30s → Cold start de Render (activa keep-alive)

### Posibles Problemas:

**MongoDB Atlas lento:**
- Verifica que tu cluster de MongoDB esté en la misma región que Render
- Región recomendada: `us-east-1` (USA) o `eu-west-1` (Europa)

**GitHub Actions no funciona:**
- Verifica que el archivo esté en `.github/workflows/keepalive.yml`
- Verifica que la URL de Render sea correcta en el secret o en el archivo
- Verifica que Actions esté habilitado en el repositorio

**Error de CORS:**
- Verifica que la variable `VITE_API_URL` en el frontend apunte a tu URL de Render
- Ejemplo: `VITE_API_URL=https://tu-backend.onrender.com`

---

## 🆘 Alternativas si GitHub Actions no funciona

### UptimeRobot (GRATIS)

1. Regístrate en https://uptimerobot.com
2. Crea un nuevo monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://tu-app.onrender.com/health`
   - **Monitoring Interval**: 5 minutos
3. Guarda el monitor

### Cron-Job.org (GRATIS)

1. Regístrate en https://cron-job.org
2. Crea un nuevo cron job:
   - **URL**: `https://tu-app.onrender.com/health`
   - **Intervalo**: Cada 14 minutos (*/14 * * * *)
3. Guarda el cron job

---

## 📊 Monitoreo

### Verificar que Keep-Alive funciona:

1. Ve a los logs de Render
2. Deberías ver peticiones GET a `/health` cada 14 minutos
3. El servicio nunca debería mostrar "Starting service..." después de configurar el keep-alive

### Consola del navegador:

Abre DevTools (F12) y ve a la pestaña Console. Deberías ver:

```
[ProductService] Cargando productos desde: ...
[fetchWithRetry] Intento 1/3 - Timeout: 30s
[ProductService] ✓ Productos cargados en 1500ms
```

---

## 💡 Tips Adicionales

- **Plan de Render gratuito**: El servicio se duerme después de 15 minutos sin actividad
- **Keep-alive**: Evita que se duerma haciendo ping cada 14 minutos
- **Primer acceso del mes**: Puede tardar más si Render reinició el servicio
- **Considera plan de pago ($7/mes)**: Si necesitas respuesta instantánea 24/7 sin keep-alive

---

## ✅ Checklist Final

- [ ] Hacer push de los cambios a GitHub
- [ ] Configurar `RENDER_URL` en GitHub Secrets o en el archivo
- [ ] Habilitar GitHub Actions en el repositorio
- [ ] Verificar que el workflow se ejecute correctamente
- [ ] Esperar 15 minutos y probar la app
- [ ] Verificar en logs que no hay cold starts

---

**¿Necesitas ayuda?** Revisa los logs de Render y GitHub Actions para identificar el problema específico.
