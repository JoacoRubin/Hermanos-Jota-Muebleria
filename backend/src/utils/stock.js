const { UMBRAL_STOCK_BAJO } = require('../constants')

/**
 * Traduce un número de unidades a lo único que el cliente tiene derecho a ver.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO VIVE EN EL SERVIDOR
 * ────────────────────────────────────────────────────────────────────────────
 * La tentación es mandar `stock: 47` y que el frontend decida no mostrarlo.
 * Eso no oculta nada: el número viaja en el JSON y se lee abriendo la pestaña
 * Network, o pegándole a `/api/productos` con curl. Filtrar en el cliente es
 * maquillaje, no privacidad.
 *
 * Así que el número exacto NO SALE del servidor. Sale esta traducción, y el
 * único caso en que se filtra una cantidad es cuando ya decidimos publicarla:
 * el aviso de escasez ("últimas 2 unidades") ES el dato, no una fuga.
 *
 * Función pura y sin dependencias de Mongoose ni de Express: se testea sola.
 *
 * @param {number} stock unidades reales en la base
 * @returns {{
 *   stockStatus: 'agotado' | 'ultimas' | 'disponible',
 *   disponible: boolean,
 *   lowStockMessage: string | null,
 *   unidadesRestantes: number | null,
 * }}
 */
function calcularEstadoStock(stock) {
  // `null`, `undefined` o basura se tratan como cero. Un producto sin stock
  // conocido se vende igual de mal que uno agotado, y esa es la opción segura:
  // nunca prometer una unidad que no se puede entregar.
  const unidades = Number.isFinite(stock) ? Math.max(0, Math.trunc(stock)) : 0

  if (unidades === 0) {
    return {
      stockStatus: 'agotado',
      disponible: false,
      lowStockMessage: 'Sin stock',
      // Cero no es información sensible: el botón deshabilitado ya lo grita.
      unidadesRestantes: 0,
    }
  }

  if (unidades <= UMBRAL_STOCK_BAJO) {
    return {
      stockStatus: 'ultimas',
      disponible: true,
      lowStockMessage:
        unidades === 1
          ? 'Última unidad disponible'
          : `Últimas ${unidades} unidades`,
      // Se expone SOLO acá: es exactamente el número que el aviso ya dice en
      // castellano. El carrito lo usa como tope para no dejar pedir de más.
      unidadesRestantes: unidades,
    }
  }

  return {
    stockStatus: 'disponible',
    disponible: true,
    lowStockMessage: null,
    // Arriba del umbral el cliente no se entera de cuántos hay. Ni aproximado.
    unidadesRestantes: null,
  }
}

module.exports = { calcularEstadoStock }
