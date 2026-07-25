import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import Toaster from '../components/ui/Toaster'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const UIContext = createContext(null)

export const useUI = () => {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI debe ser usado dentro de UIProvider')
  }
  return context
}

let contadorId = 0

/**
 * Reemplaza `alert()` y `window.confirm()`.
 *
 * Los diálogos nativos bloquean el hilo principal, no se pueden estilar, son
 * horribles en mobile y no admiten personalización de accesibilidad. Había 12
 * usos repartidos por la app.
 *
 * `confirm()` devuelve una promesa que resuelve a un booleano, así que el
 * código que lo consume se lee igual de simple que el `window.confirm` que
 * reemplaza — pero sin ninguna de sus desventajas.
 */
export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const [dialogo, setDialogo] = useState(null)
  const resolverRef = useRef(null)

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (mensaje, { tipo = 'info', duracion = 4000 } = {}) => {
      const id = ++contadorId
      setToasts((prev) => [...prev, { id, mensaje, tipo }])

      if (duracion > 0) {
        setTimeout(() => dismissToast(id), duracion)
      }

      return id
    },
    [dismissToast]
  )

  const toast = useMemo(
    () => ({
      success: (mensaje, options) =>
        showToast(mensaje, { ...options, tipo: 'success' }),
      error: (mensaje, options) =>
        showToast(mensaje, { ...options, tipo: 'error', duracion: 6000 }),
      info: (mensaje, options) =>
        showToast(mensaje, { ...options, tipo: 'info' }),
    }),
    [showToast]
  )

  const confirm = useCallback((opciones) => {
    setDialogo({
      titulo: '¿Confirmás?',
      mensaje: '',
      textoConfirmar: 'Confirmar',
      textoCancelar: 'Cancelar',
      peligroso: false,
      ...opciones,
    })

    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const responderDialogo = useCallback((respuesta) => {
    setDialogo(null)
    resolverRef.current?.(respuesta)
    resolverRef.current = null
  }, [])

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  return (
    <UIContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismissToast} />
      {dialogo && (
        <ConfirmDialog
          {...dialogo}
          onConfirm={() => responderDialogo(true)}
          onCancel={() => responderDialogo(false)}
        />
      )}
    </UIContext.Provider>
  )
}

export default UIContext
