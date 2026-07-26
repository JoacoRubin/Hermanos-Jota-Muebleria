import { describe, it, expect } from 'vitest'

/**
 * Smoke test del grafo de imports.
 *
 * No renderiza nada: solo importa cada pantalla y verifica que exporte un
 * componente. Suena poco, y sin embargo es lo que detecta la clase de error
 * más tonta y más cara del frontend —una ruta de import mal escrita, un
 * `export default` que falta, una constante renombrada en un lado y no en el
 * otro—, que en tiempo de ejecución aparece como una pantalla en blanco.
 *
 * Estas pantallas no tienen tests de comportamiento todavía. Que al menos no
 * puedan estar rotas de entrada.
 */
const PANTALLAS = {
  Home: () => import('./Home'),
  Products: () => import('./Products'),
  ProductDetail: () => import('./ProductDetail'),
  Cart: () => import('./Cart'),
  Contact: () => import('./Contact'),
  Login: () => import('./Login'),
  Register: () => import('./Register'),
  Profile: () => import('./Profile'),
  MisPedidos: () => import('./MisPedidos'),
  ForgotPassword: () => import('./ForgotPassword'),
  ResetPassword: () => import('./ResetPassword'),
  NotFound: () => import('./NotFound'),
  AdminPedidos: () => import('./admin/AdminPedidos'),
  AdminStock: () => import('./admin/AdminStock'),
}

describe('las pantallas se pueden importar', () => {
  for (const [nombre, cargar] of Object.entries(PANTALLAS)) {
    it(`${nombre} exporta un componente`, async () => {
      const modulo = await cargar()
      expect(typeof modulo.default).toBe('function')
    })
  }
})

describe('App monta el árbol de rutas completo', () => {
  it('se importa sin romperse', async () => {
    const modulo = await import('../App')
    expect(typeof modulo.default).toBe('function')
  })
})
