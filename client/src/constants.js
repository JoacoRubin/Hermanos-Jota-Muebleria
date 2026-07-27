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

// ─── Pedidos ────────────────────────────────────────────────────────────────

/** El camino feliz, en orden. Es lo que dibuja la línea de tiempo. */
export const FLUJO_PEDIDO = ['pendiente', 'aceptado', 'despachado', 'entregado']

/**
 * Espejo de `TRANSICIONES_PEDIDO`.
 *
 * Acá sirve para UNA sola cosa: saber qué botones ofrecerle al admin. La
 * decisión real la toma el servidor, que rechaza con 409 cualquier transición
 * inválida. Esconder un botón no es una validación.
 */
export const TRANSICIONES_PEDIDO = {
  pendiente: ['aceptado', 'cancelado'],
  aceptado: ['despachado', 'cancelado'],
  despachado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
}

/*
 * NO hay espejo de ESTADOS_CANCELABLES_CLIENTE / _ADMIN, y es deliberado.
 *
 * Se escribieron y no los usó nadie: el servidor manda `puedeCancelarCliente`
 * ya calculado en cada pedido, así que el cliente nunca necesitó reimplementar
 * la regla. Duplicar una regla de negocio "por las dudas" es exactamente cómo
 * se termina con dos versiones que un día dejan de coincidir.
 */

/** Las pestañas de "Mis pedidos". El orden es el que se ve en pantalla. */
export const GRUPOS_MIS_PEDIDOS = [
  {
    clave: 'pendientes',
    etiqueta: 'Pendientes',
    estados: ['pendiente', 'aceptado', 'despachado'],
  },
  { clave: 'entregados', etiqueta: 'Entregados', estados: ['entregado'] },
  { clave: 'cancelados', etiqueta: 'Cancelados', estados: ['cancelado'] },
]

/** Los estados son minúsculas en la API; en pantalla van con mayúscula. */
export const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  despachado: 'Despachado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

/** Verbo de la acción que LLEVA a cada estado. Para los botones del admin. */
export const ACCION_HACIA_ESTADO = {
  aceptado: 'Aceptar',
  despachado: 'Despachar',
  entregado: 'Marcar entregado',
  cancelado: 'Cancelar',
}

export const COLOR_POR_ESTADO = {
  pendiente: '#FFA500',
  aceptado: '#2196F3',
  despachado: '#9C27B0',
  entregado: '#4CAF50',
  cancelado: '#F44336',
}

// ─── Stock ──────────────────────────────────────────────────────────────────

/**
 * Espejo de `UMBRAL_STOCK_BAJO`.
 *
 * Ojo: el cliente NO calcula el aviso de escasez con esto. El mensaje
 * ("Últimas 2 unidades") lo arma el servidor y viaja en `lowStockMessage`,
 * justamente para no depender de un número que el frontend nunca debería
 * necesitar. Acá está solo para textos del panel de admin.
 */
export const UMBRAL_STOCK_BAJO = 3

/**
 * Las claves son el espejo de `MOTIVOS_MOVIMIENTO_STOCK` del backend.
 *
 * Antes había además un array `MOTIVOS_MOVIMIENTO_STOCK` acá, que no usaba
 * nadie: este objeto ya lleva la lista completa en sus claves, así que tener
 * las dos cosas era garantizar que un día se desincronicen.
 */
export const ETIQUETA_MOTIVO = {
  reposicion: 'Reposición',
  venta: 'Venta',
  cancelacion: 'Cancelación de pedido',
  ajuste: 'Ajuste manual',
}

export const MAX_REPOSICION_POR_MOVIMIENTO = 10_000

/**
 * Tope de unidades por ítem del pedido. Espejo de `MAX_CANTIDAD_POR_ITEM`.
 *
 * El carrito lo usa como límite cuando NO conoce el stock —que es el caso
 * normal, porque el servidor solo revela unidades cuando quedan pocas.
 */
export const MAX_CANTIDAD_POR_ITEM = 100

// ─── Formateo ───────────────────────────────────────────────────────────────

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
