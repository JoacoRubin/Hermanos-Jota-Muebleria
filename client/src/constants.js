/**
 * Vocabulario del dominio compartido con la API.
 *
 * ⚠️ Espejo de `backend/src/constants.js`. No se importa directamente porque
 * el backend es CommonJS, el cliente es ESM y —sobre todo— porque el backend
 * se despliega solo (Render usa `backend/` como root): cualquier import que
 * cruce esa frontera se rompe en producción. Fue exactamente el bug que tenía
 * el viejo `seed.js`.
 *
 * Si cambia una de las dos listas, tiene que cambiar la otra. El backend
 * valida con `enum`, así que una desincronización se manifiesta como un 400
 * claro y no como datos corruptos.
 */

export const CATEGORIAS = [
  'Sillas',
  'Mesas',
  'Sofás',
  'Camas',
  'Escritorios',
  'Estanterías',
  'Almacenamiento',
  'Otros',
]

export const ESTADOS_PEDIDO = [
  'pendiente',
  'procesando',
  'enviado',
  'entregado',
  'cancelado',
]

export const COLOR_POR_ESTADO = {
  pendiente: '#FFA500',
  procesando: '#2196F3',
  enviado: '#9C27B0',
  entregado: '#4CAF50',
  cancelado: '#F44336',
}

/** Formatea importes en pesos argentinos de forma consistente en toda la app. */
export const formatearPrecio = (valor) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor ?? 0)

/** Fecha legible; devuelve un guion si el valor no es una fecha válida. */
export const formatearFecha = (valor, opciones = {}) => {
  if (!valor) return '—'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'

  return fecha.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...opciones,
  })
}
