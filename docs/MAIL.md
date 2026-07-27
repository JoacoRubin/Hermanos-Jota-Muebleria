# Envío de mails

## Estado actual

El flujo de "Olvidé mi contraseña" está **implementado y probado de punta a
punta**, y hay un driver de Brevo listo para usar. Mientras no se configure,
el mail no sale a internet.

| Driver | Cuándo | Qué pasa |
| --- | --- | --- |
| `console` | Default en desarrollo | El mail entero, con el link, se imprime en la consola del servidor. El flujo se prueba completo. |
| `noop` | Default en producción | El mail se descarta y queda un `console.warn` en el log. **El usuario no recibe nada.** |
| `brevo` | Hay que activarlo | Envía de verdad. Ver "Activarlo gratis" más abajo. |

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

## Activarlo gratis, sin dominio propio

El driver **ya está escrito** (`crearBrevoMailer`). Lo único que falta es
crear la cuenta y cargar dos variables.

### Por qué Brevo y no Resend

Los proveedores verifican al remitente de dos formas distintas:

| Forma | Qué pide | ¿Necesita dominio? |
| --- | --- | --- |
| Verificación de **dominio** | Registros SPF/DKIM/DMARC en el DNS | Sí |
| Verificación de **remitente único** | Un click en un mail de confirmación | **No** |

[Brevo](https://www.brevo.com) admite la segunda y da **300 mails por día
gratis, para siempre, sin tarjeta**. Alcanza con verificar una casilla —un
Gmail sirve—. Su API es HTTP, así que entra con `fetch` y **no agrega
dependencias** al proyecto.

Resend y SendGrid solo dejan mandar a tu propia casilla mientras no verifiques
un dominio, así que no sirven para que un cliente recupere su cuenta.

### Los cinco pasos

1. Creá una cuenta en [brevo.com](https://www.brevo.com) (plan gratuito).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender.** Poné la
   casilla desde la que querés que salgan los mails. Te llega un mail de
   confirmación: hacé click.
3. **SMTP & API → API Keys → Generate a new API key.** Copiala; se muestra
   una sola vez.
4. Cargá en Render (**Environment**):

   ```dotenv
   MAIL_DRIVER=brevo
   BREVO_API_KEY=xkeysib-...
   MAIL_FROM=la-casilla-que-verificaste@gmail.com
   MAIL_FROM_NOMBRE=Mueblería Hermanos Jota
   ```

5. Guardá. Render redeploya y la recuperación de contraseña empieza a enviar.

> El servidor **no arranca** si ponés `MAIL_DRIVER=brevo` y falta
> `BREVO_API_KEY` o `MAIL_FROM`. Es deliberado: sin esa guarda el proceso
> levantaría bien y el fallo aparecería recién cuando un usuario real intente
> recuperar su cuenta — y en silencio, porque el error se traga a propósito
> para no delatar qué cuentas existen.

### La limitación que tenés que conocer

Mandando "desde" un Gmail a través de los servidores de Brevo, la firma DKIM
**no alinea** con `gmail.com`. Como Gmail publica DMARC en `p=none`, el mail
no se rechaza, pero **una parte va a caer en spam**.

Para un proyecto de portfolio es aceptable. Para vender de verdad, no: ahí sí
hace falta un dominio propio con SPF/DKIM.

**Si sos estudiante**, el [GitHub Student Developer Pack](https://education.github.com/pack)
incluye un dominio gratis por un año (Namecheap regala un `.me`). Con eso
verificás el dominio en Brevo o Resend, la firma alinea y el problema de spam
desaparece — sin gastar nada.

### Agregar otro proveedor más adelante

Un archivo, una función. Se escribe un `crearXMailer(env)` que devuelva
`{ nombre, enviar }`, se lo suma al mapa `DRIVERS`, y se agrega la clave al
enum de `MAIL_DRIVER` en `config/env.js`.

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
