/**
 * Migración 001 — renombra los estados de pedido y siembra el historial.
 *
 *   npm run migrate:001            → muestra qué haría, sin escribir nada
 *   npm run migrate:001 -- --apply → aplica los cambios
 *
 * QUÉ CAMBIA
 *   estado: 'procesando' → 'aceptado'
 *   estado: 'enviado'    → 'despachado'
 *
 * Y además: todo pedido anterior a esta migración no tiene `historialEstados`
 * (la funcionalidad no existía). Sin al menos una entrada, la línea de tiempo
 * del cliente se ve vacía incluso para pedidos entregados. Así que se les
 * siembra una entrada única con el estado actual y la fecha de creación,
 * marcada con `rol: 'migracion'` para que quede claro que es reconstruido y
 * no un registro real de lo que pasó. Prefiero un dato explícitamente
 * aproximado que una historia inventada paso por paso.
 *
 * Es IDEMPOTENTE: correrla dos veces no rompe nada. La segunda vez no encuentra
 * estados viejos ni pedidos sin historial, y no hace nada.
 */
require('dotenv').config()

const mongoose = require('mongoose')
const { env } = require('../config')
const { connectDatabase, disconnectDatabase } = require('../config/db')
const Order = require('../models/Order')

const RENOMBRES = Object.freeze({
  procesando: 'aceptado',
  enviado: 'despachado',
})

const aplicar = process.argv.slice(2).includes('--apply')

async function renombrarEstados() {
  const resultados = []

  for (const [viejo, nuevo] of Object.entries(RENOMBRES)) {
    // `strict: false` es imprescindible: 'procesando' ya NO está en el enum
    // del schema, así que una query normal de Mongoose lo castea/rechaza.
    // Se va por el driver crudo, que no conoce el schema.
    const coleccion = Order.collection
    const cantidad = await coleccion.countDocuments({ estado: viejo })

    if (cantidad === 0) {
      resultados.push(`  ${viejo} → ${nuevo}: nada que migrar`)
      continue
    }

    if (aplicar) {
      await coleccion.updateMany({ estado: viejo }, { $set: { estado: nuevo } })
      // El historial viejo también puede tener el nombre anterior.
      await coleccion.updateMany(
        { 'historialEstados.estado': viejo },
        { $set: { 'historialEstados.$[entrada].estado': nuevo } },
        { arrayFilters: [{ 'entrada.estado': viejo }] }
      )
    }

    resultados.push(
      `  ${viejo} → ${nuevo}: ${cantidad} pedido(s)${aplicar ? ' migrados' : ' a migrar'}`
    )
  }

  return resultados
}

async function sembrarHistorial() {
  const coleccion = Order.collection
  const filtro = {
    $or: [
      { historialEstados: { $exists: false } },
      { historialEstados: { $size: 0 } },
    ],
  }

  const cantidad = await coleccion.countDocuments(filtro)
  if (cantidad === 0) return '  historial: todos los pedidos ya lo tienen'

  if (aplicar) {
    // Una entrada por pedido, con su estado y su fecha de creación reales.
    // `$$NOW` no sirve acá: mentiría la fecha. Se usa el `createdAt` del
    // propio documento con un pipeline de update.
    await coleccion.updateMany(filtro, [
      {
        $set: {
          historialEstados: [
            {
              estado: '$estado',
              fecha: { $ifNull: ['$createdAt', '$$NOW'] },
              usuario: null,
              rol: 'migracion',
              nota: 'Historial reconstruido por la migración 001',
            },
          ],
        },
      },
    ])
  }

  return `  historial: ${cantidad} pedido(s)${aplicar ? ' sembrados' : ' a sembrar'}`
}

async function main() {
  await connectDatabase(env.MONGO_URI)

  console.log(
    aplicar
      ? '\nMigración 001 — APLICANDO cambios\n'
      : '\nMigración 001 — SIMULACIÓN (no se escribe nada)\n' +
          'Para aplicar de verdad: npm run migrate:001 -- --apply\n'
  )

  for (const linea of await renombrarEstados()) console.log(linea)
  console.log(await sembrarHistorial())

  console.log(aplicar ? '\nListo.\n' : '\nNada se escribió.\n')

  await disconnectDatabase()
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('\nError durante la migración:', error.message)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
