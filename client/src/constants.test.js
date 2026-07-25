import { describe, it, expect } from 'vitest'
import { formatearPrecio, formatearFecha, CATEGORIAS } from './constants'

describe('formatearPrecio', () => {
  it('formatea en pesos argentinos', () => {
    const formateado = formatearPrecio(245000)
    expect(formateado).toContain('245.000')
    expect(formateado).toContain('$')
  })

  it('trata null y undefined como cero en vez de romper', () => {
    expect(formatearPrecio(null)).toContain('0')
    expect(formatearPrecio(undefined)).toContain('0')
  })
})

describe('formatearFecha', () => {
  it('formatea una fecha válida', () => {
    expect(formatearFecha('2026-03-15T10:00:00.000Z')).toMatch(/2026/)
  })

  // ── Regresión del bug B4 ──────────────────────────────────────────────
  // MisPedidos leía `order.fechaPedido`, un campo inexistente: en pantalla
  // se veía "Invalid Date" en todos los pedidos.
  it('devuelve un guion ante un valor inválido', () => {
    expect(formatearFecha(undefined)).toBe('—')
    expect(formatearFecha(null)).toBe('—')
    expect(formatearFecha('no-es-una-fecha')).toBe('—')
  })
})

describe('CATEGORIAS', () => {
  it('no tiene duplicados', () => {
    expect(new Set(CATEGORIAS).size).toBe(CATEGORIAS.length)
  })
})
