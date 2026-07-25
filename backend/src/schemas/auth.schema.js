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

module.exports = { registerSchema, loginSchema }
