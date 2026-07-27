/**
 * Migración 002 — asienta el saldo inicial de los productos que ya existían.
 *
 *   npm run migrate:002            → muestra qué haría, sin escribir nada
 *   npm run migrate:002 -- --apply → aplica los cambios
 *
 * POR QUÉ HACE FALTA
 * El libro mayor (`stockmovements`) se agregó después de que el catálogo ya
 * estuviera cargado. Resultado: hay productos con stock y CERO filas que lo
 * expliquen, así que la suma del libro no cuadra contra `Product.stock` y la
 * primera auditoría del inventario da mal desde el arranque.
 *
 * Esta migración escribe la fila que faltaba: un movimiento de apertura por
 * producto, con el stock que tiene hoy. No inventa historia —no simula ventas
 * ni reposiciones que nunca ocurrieron—, solo declara el punto de partida, que
 * es lo que un asiento de apertura es en cualquier libro contable.
 *
 * Es IDEMPOTENTE: solo toca productos SIN ningún movimiento registrado. Un
 * producto que ya tiene historial se saltea, así que correrla dos veces no
 * duplica nada.
 */
require('dotenv').config()

const mongoose = require('mongoose')
const { env } = require('../config')
const { connectDatabase, disconnectDatabase } = require('../config/db')
const Product = require('../models/Product')
const StockMovement = require('../models/StockMovement')
const { hostDe } = require('../utils/mongoUri')

const aplicar = process.argv.slice(2).includes('--apply')

async function main() {
  await connectDatabase(env.MONGO_URI)

  console.log(
    aplicar
      ? '\nMigración 002 — APLICANDO cambios\n'
      : '\nMigración 002 — SIMULACIÓN (no se escribe nada)\n' +
          'Para aplicar de verdad: npm run migrate:002 -- --apply\n'
  )
  console.log(`  Host: ${hostDe(env.MONGO_URI)}`)
  console.log(`  Base: ${mongoose.connection.name}\n`)

  const productos = await Product.find().select('nombre stock').lean()

  if (productos.length === 0) {
    console.log('  No hay productos. Nada que hacer.\n')
    await disconnectDatabase()
    return
  }

  // Un solo query en vez de uno por producto: con un catálogo grande, N+1
  // consultas contra Atlas es la diferencia entre segundos y minutos.
  const conMovimientos = new Set(
    (await StockMovement.distinct('producto')).map((id) => id.toString())
  )

  const pendientes = productos.filter(
    (p) => !conMovimientos.has(p._id.toString()) && p.stock > 0
  )

  const yaTenian = productos.length - pendientes.length

  console.log(`  Productos en el catálogo: ${productos.length}`)
  console.log(`  Ya tenían movimientos (o stock 0): ${yaTenian}`)
  console.log(`  Sin saldo inicial asentado: ${pendientes.length}\n`)

  if (pendientes.length === 0) {
    console.log('  El libro mayor ya está cuadrado.\n')
    await disconnectDatabase()
    return
  }

  for (const p of pendientes) {
    console.log(`    ${p.nombre}: +${p.stock}`)
  }

  if (aplicar) {
    await StockMovement.insertMany(
      pendientes.map((p) => ({
        producto: p._id,
        nombreProducto: p.nombre,
        cantidad: p.stock,
        motivo: 'reposicion',
        // `null` y no un usuario inventado: nadie hizo esta reposición, es un
        // asiento de apertura. Mentir sobre quién movió stock es peor que
        // admitir que no se sabe.
        usuario: null,
        stockResultante: p.stock,
        nota: 'Saldo inicial reconstruido por la migración 002',
      }))
    )
    console.log(`\n  ${pendientes.length} movimiento(s) de apertura asentados.\n`)
  } else {
    console.log('\n  Nada se escribió.\n')
  }

  await disconnectDatabase()
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('\nError durante la migración:', error.message)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
