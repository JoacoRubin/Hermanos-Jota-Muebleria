import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderTimeline from './OrderTimeline'
import { FLUJO_PEDIDO } from '../../constants'

const historial = (...pares) =>
  pares.map(([estado, fecha]) => ({ estado, fecha, rol: 'admin', nota: '' }))

/** Devuelve el <li> del paso cuyo texto empieza con la etiqueta. */
const paso = (etiqueta) => screen.getByText(etiqueta).closest('li')

describe('OrderTimeline', () => {
  it('marca los pasos anteriores como completados y el actual como actual', () => {
    render(
      <OrderTimeline
        estado="despachado"
        historialEstados={historial(
          ['pendiente', '2026-03-01T10:00:00.000Z'],
          ['aceptado', '2026-03-02T10:00:00.000Z'],
          ['despachado', '2026-03-03T10:00:00.000Z']
        )}
      />
    )

    expect(paso('Pendiente')).toHaveClass('is-completado')
    expect(paso('Aceptado')).toHaveClass('is-completado')
    expect(paso('Despachado')).toHaveClass('is-actual')
    expect(paso('Entregado')).toHaveClass('is-pendiente')
  })

  it('un pedido recién creado tiene todo pendiente salvo el primer paso', () => {
    render(
      <OrderTimeline
        estado="pendiente"
        historialEstados={historial(['pendiente', '2026-03-01T10:00:00.000Z'])}
      />
    )

    expect(paso('Pendiente')).toHaveClass('is-actual')
    for (const etiqueta of ['Aceptado', 'Despachado', 'Entregado']) {
      expect(paso(etiqueta)).toHaveClass('is-pendiente')
    }
  })

  it('un pedido entregado tiene todos los pasos recorridos', () => {
    render(
      <OrderTimeline
        estado="entregado"
        historialEstados={historial(
          ['pendiente', '2026-03-01T10:00:00.000Z'],
          ['aceptado', '2026-03-02T10:00:00.000Z'],
          ['despachado', '2026-03-03T10:00:00.000Z'],
          ['entregado', '2026-03-05T10:00:00.000Z']
        )}
      />
    )

    for (const etiqueta of ['Pendiente', 'Aceptado', 'Despachado']) {
      expect(paso(etiqueta)).toHaveClass('is-completado')
    }
    expect(paso('Entregado')).toHaveClass('is-actual')
  })

  it('muestra la fecha de cada paso tomada del historial', () => {
    render(
      <OrderTimeline
        estado="aceptado"
        historialEstados={historial(
          ['pendiente', '2026-03-01T10:00:00.000Z'],
          ['aceptado', '2026-03-02T10:00:00.000Z']
        )}
      />
    )

    expect(paso('Pendiente')).toHaveTextContent('2026')
    // Un paso sin historial no inventa una fecha: muestra un guion.
    expect(paso('Entregado')).toHaveTextContent('—')
  })

  it('un pedido cancelado NO dibuja los pasos que nunca ocurrieron', () => {
    render(
      <OrderTimeline
        estado="cancelado"
        historialEstados={historial(
          ['pendiente', '2026-03-01T10:00:00.000Z'],
          ['aceptado', '2026-03-02T10:00:00.000Z'],
          ['cancelado', '2026-03-03T10:00:00.000Z']
        )}
      />
    )

    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Aceptado')).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()

    // El pedido salió del flujo: no tiene sentido mostrar "Despachado" ni
    // "Entregado" como pasos pendientes de algo que ya está cerrado.
    expect(screen.queryByText('Despachado')).not.toBeInTheDocument()
    expect(screen.queryByText('Entregado')).not.toBeInTheDocument()
  })

  it('sobrevive a un historial vacío sin romperse', () => {
    render(<OrderTimeline estado="pendiente" historialEstados={[]} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(FLUJO_PEDIDO.length)
    expect(paso('Pendiente')).toHaveTextContent('—')
  })

  it('anuncia el estado actual para lectores de pantalla', () => {
    render(
      <OrderTimeline
        estado="aceptado"
        historialEstados={historial(['aceptado', '2026-03-02T10:00:00.000Z'])}
      />
    )

    expect(paso('Aceptado')).toHaveTextContent('(estado actual)')
  })
})
