import { GRUPOS_MIS_PEDIDOS } from '../../constants'

/**
 * Pestañas Pendientes / Entregados / Cancelados.
 *
 * Estaban escritas dos veces, idénticas, en `MisPedidos` y en `AdminPedidos`
 * —incluidos los `role="tab"` y el `aria-selected`—. Duplicar markup
 * accesible es la peor forma de duplicarlo: cuando alguien arregla el ARIA en
 * una copia, la otra queda rota y nadie se entera, porque el bug solo lo ve
 * quien usa un lector de pantalla.
 *
 * `etiquetas` permite renombrar una pestaña sin bifurcar el componente: el
 * admin llama "En curso" a lo que el cliente ve como "Pendientes".
 */
function OrderTabs({ grupo, onCambiar, etiquetas = {}, label = 'Filtrar pedidos' }) {
  return (
    <div className="pedidos-tabs" role="tablist" aria-label={label}>
      {GRUPOS_MIS_PEDIDOS.map(({ clave, etiqueta }) => (
        <button
          key={clave}
          type="button"
          role="tab"
          aria-selected={grupo === clave}
          className={`pedidos-tab ${grupo === clave ? 'is-activa' : ''}`}
          onClick={() => onCambiar(clave)}
        >
          {etiquetas[clave] ?? etiqueta}
        </button>
      ))}
    </div>
  )
}

export default OrderTabs
