# Envío de mails

## Estado actual: no hay proveedor configurado

El flujo de "Olvidé mi contraseña" está **implementado y probado de punta a
punta**, pero el mail no sale a internet porque el proyecto todavía no tiene
un proveedor de correo conectado.

Concretamente:

| Entorno | Driver por defecto | Qué pasa |
| --- | --- | --- |
| Desarrollo | `console` | El mail entero, con el link, se imprime en la consola del servidor. El flujo se prueba completo. |
| Producción | `noop` | El mail se descarta y queda un `console.warn` en el log. **El usuario no recibe nada.** |

> El default de producción es `noop` y **no** `console` a propósito. Imprimir
> un link de recuperación en el log de producción sería regalarle acceso a
> cualquiera que pueda leer los logs: el panel de Render, un agregador de
> logs, cualquiera con permiso de lectura. Un mail que no llega es un problema
> visible; un token en un log es una puerta abierta que nadie mira.

## Probar el flujo en desarrollo

1. Levantá el backend (`npm run dev` en `backend/`).
2. Entrá a `/recuperar-password` en el frontend y poné un email registrado.
3. Mirá la consola del backend: aparece el mail completo enmarcado, con el
   link de la forma `http://localhost:5173/restablecer-password?token=…`.
4. Abrí ese link y definí la contraseña nueva.

El token vive una hora (`PASSWORD_RESET_TTL_MINUTES`) y se puede usar **una
sola vez**.

## Qué falta para producción

Hay que hacer **tres cosas**. La arquitectura ya está lista: el controller de
auth no sabe nada de proveedores, habla con la interfaz de
`backend/src/services/mailer.js`.

### 1. Elegir un proveedor y crear la cuenta

Opciones razonables para este proyecto (todas tienen plan gratuito suficiente
para un e-commerce chico):

| Proveedor | Gratis | Nota |
| --- | --- | --- |
| [Resend](https://resend.com) | 3.000 mails/mes | API simple, la más rápida de integrar |
| [SendGrid](https://sendgrid.com) | 100 mails/día | El clásico |
| SMTP propio (Gmail, Zoho) | — | Requiere `nodemailer`, que **hoy no es dependencia del proyecto** |

Resend y SendGrid se pueden usar con `fetch` contra su API REST, así que **no
haría falta agregar ninguna dependencia**. Con SMTP sí: habría que instalar
`nodemailer`.

### 2. Verificar el dominio del remitente

Sin esto los mails caen en spam o directamente los rechazan. En el panel del
proveedor hay que cargar los registros DNS del dominio:

- **SPF** — autoriza al proveedor a mandar en nombre del dominio
- **DKIM** — firma criptográfica de cada mail
- **DMARC** — qué hacer con los mails que no pasan las dos anteriores

Mientras el dominio no esté verificado, los proveedores solo dejan mandar a la
casilla del dueño de la cuenta.

### 3. Escribir el driver

Un archivo, una función. En `backend/src/services/mailer.js`:

```js
function crearResendMailer(env) {
  return {
    nombre: 'resend',
    async enviar({ para, asunto, texto, html }) {
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.MAIL_FROM,       // ej: 'Hermanos Jota <no-reply@tudominio.com>'
          to: para,
          subject: asunto,
          text: texto,
          ...(html ? { html } : {}),
        }),
      })

      if (!respuesta.ok) {
        throw new Error(`Resend respondió ${respuesta.status}`)
      }

      return { enviado: true, driver: 'resend' }
    },
  }
}
```

Después:

1. Agregalo al mapa `DRIVERS` con la clave `resend`.
2. Sumá `'resend'` al enum de `MAIL_DRIVER` en `backend/src/config/env.js`, y
   declará ahí `RESEND_API_KEY` y `MAIL_FROM`.
3. Cargá esas variables en Render y poné `MAIL_DRIVER=resend`.

**Nada más cambia.** El controller de auth, los schemas, los tests y las
pantallas del frontend quedan igual. Ese es el punto de haber puesto una
interfaz en lugar de llamar a un SDK desde el controller.

## Por qué el controller no puede fallar aunque el mail falle

En `forgotPassword`, el envío está envuelto en un `try/catch` que sólo loguea:

```js
try {
  await mailer.enviar({ para: user.email, asunto, texto })
} catch (error) {
  console.error('[auth] Falló el envío del mail de recuperación:', error.message)
}
```

No es descuido. Si el error se propagara, el endpoint devolvería 500 para un
email **existente** y 200 para uno **inexistente** — y eso vuelve a delatar
qué cuentas están registradas, que es exactamente lo que todo el diseño de
este flujo trata de evitar.
