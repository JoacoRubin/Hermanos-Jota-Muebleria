const { z } = require('zod')

/**
 * Política de contraseñas: se aplica SOLO al registro.
 *
 * El login valida nada más que "vino algo", a propósito: si endureciéramos la
 * regla en el login, los usuarios creados con la política vieja (6 caracteres)
 * quedarían encerrados afuera de su propia cuenta.
 */
const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres')
  .refine((value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), {
    message: 'La contraseña debe incluir al menos una letra y un número',
  })

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Ingresá un email válido')
  .max(254)

// `.strict()` rechaza cualquier campo no declarado. Es lo que impide que
// alguien mande `{ "role": "admin" }` en el registro y se autoascienda.
const registerSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(80, 'El nombre no puede superar los 80 caracteres'),
    email,
    password,
  })
  .strict()

const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'La contraseña es requerida').max(128),
  })
  .strict()

const forgotPasswordSchema = z.object({ email }).strict()

const resetPasswordSchema = z
  .object({
    // El token viaja en el body, no en la URL.
    //
    // Un token en la query string se guarda en el historial del navegador, en
    // los logs de acceso del servidor y en el header `Referer` de cualquier
    // recurso externo que cargue esa página. El link del mail SÍ lo lleva en
    // la URL —no hay alternativa—, pero el canje se hace por POST: la pantalla
    // de React lo lee de la URL y lo manda en el cuerpo.
    token: z
      .string()
      .trim()
      .min(20, 'Token inválido')
      .max(200, 'Token inválido'),
    // Misma política que el registro: una contraseña nueva es una contraseña
    // nueva, y no hay razón para aceptar acá algo que no se aceptaría allá.
    password,
  })
  .strict()

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
}
