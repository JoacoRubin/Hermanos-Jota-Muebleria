# 🚨 Solución al Error de CORS

## ❌ Problema Identificado

```
Access to fetch at 'https://hermanos-jota-muebleria-1.onrender.com/api/productos' 
from origin 'https://vermillion-gnome-5f2469.netlify.app' has been blocked by CORS policy
```

Este error significa que el backend en Render está **bloqueando las peticiones** desde tu frontend en Netlify por seguridad.

---

## ✅ Solución Aplicada

Se configuró CORS en el backend para permitir peticiones desde:
- `http://localhost:5173` (desarrollo local Vite)
- `http://localhost:5174` (desarrollo local Vite alternativo)
- `http://localhost:3000` (desarrollo local alternativo)
- `https://vermillion-gnome-5f2469.netlify.app` (tu frontend actual)
- Variable de entorno `FRONTEND_URL` (configurable en Render)

---

## 📋 Pasos para Completar la Configuración

### 1. Configurar Variable de Entorno en Render

1. Ve a tu Dashboard de Render: https://dashboard.render.com
2. Selecciona tu servicio backend (Web Service)
3. Ve a la pestaña **Environment**
4. Agrega una nueva variable de entorno:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://vermillion-gnome-5f2469.netlify.app`
5. Click en **Save Changes**

**⚠️ Importante**: Render hará **redeploy automáticamente** cuando guardes los cambios de variables de entorno.

### 2. Push de los Cambios al Repositorio

```bash
cd c:\Users\famas\OneDrive\Escritorio\hj\Hermanos-Jota-Muebleria
git add .
git commit -m "Fix: Configurar CORS para permitir frontend de Netlify"
git push origin main
```

Esto activará el deploy en Render con la nueva configuración de CORS.

### 3. Verificar en Render

Después del deploy (tarda 2-3 minutos):

1. Ve a los **Logs** de tu servicio en Render
2. Verifica que no haya errores
3. Busca la línea que dice: `✓ Servidor iniciado en puerto 5000`

### 4. Probar la Aplicación

1. Ve a: https://vermillion-gnome-5f2469.netlify.app/productos
2. Abre DevTools (F12) → Pestaña **Console**
3. **NO** deberías ver más el error de CORS
4. Los productos deberían cargar correctamente

---

## 🔍 Si Cambias la URL de Netlify

Si redespliegas el frontend y cambias la URL de Netlify:

1. Actualiza la variable `FRONTEND_URL` en Render con la nueva URL
2. O edita [backend/src/app.js](backend/src/app.js) línea 15 y agrega la nueva URL al array `allowedOrigins`
3. Haz commit y push de los cambios

---

## 🆘 Troubleshooting

### El error de CORS persiste después del deploy:

1. **Verifica que Render haya hecho redeploy**:
   - Ve a Render Dashboard → tu servicio → Events
   - Deberías ver "Deploy finished" con timestamp reciente

2. **Limpia la caché del navegador**:
   - Presiona `Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac)
   - Esto fuerza una recarga sin caché

3. **Verifica la variable de entorno**:
   - En Render → Environment → Busca `FRONTEND_URL`
   - Debe ser exactamente: `https://vermillion-gnome-5f2469.netlify.app`
   - **Sin** `/` al final

4. **Verifica los logs de Render**:
   - Si ves `CORS: Origen no permitido: https://...`
   - Significa que la URL no está en la lista de permitidos
   - Verifica que la URL coincida exactamente

### Testing local con el backend de producción:

Si quieres probar localmente contra el backend de Render:

Edita `client/.env.local`:
```
VITE_API_URL=https://hermanos-jota-muebleria-1.onrender.com
```

Luego reinicia el servidor de desarrollo del frontend.

---

## 📊 Configuración Actual

### Orígenes Permitidos:
- ✅ `http://localhost:5173` (desarrollo local)
- ✅ `http://localhost:5174` (desarrollo local)
- ✅ `http://localhost:3000` (desarrollo local)
- ✅ `https://vermillion-gnome-5f2469.netlify.app` (producción)
- ✅ Valor de `process.env.FRONTEND_URL` (configurable en Render)

### Métodos HTTP Permitidos:
- GET, POST, PUT, DELETE, OPTIONS

### Headers Permitidos:
- Content-Type
- Authorization (para JWT)

---

## 🔐 Seguridad

La configuración actual:
- ✅ Solo permite orígenes específicos en producción
- ✅ Permite credentials (cookies, tokens)
- ✅ Permite headers de autenticación
- ⚠️ En desarrollo (`NODE_ENV !== 'production'`) permite todos los orígenes para facilitar testing

---

**Siguiente paso**: Haz push de los cambios y configura la variable `FRONTEND_URL` en Render.
