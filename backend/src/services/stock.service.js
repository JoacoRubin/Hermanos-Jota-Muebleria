const Product = require('../models/Product')
const StockMovement = require('../models/StockMovement')

/**
 * Todo lo que toca el inventario pasa por acá.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CÓMO SE MANEJA LA CONCURRENCIA (y por qué NO hay transacciones)
 * ────────────────────────────────────────────────────────────────────────────
 * Dos personas comprando la última butaca al mismo tiempo es el caso que hay
 * que ganar. La solución NO es leer el stock, comparar y después escribirlo:
 * entre la lectura y la escritura entra la otra compra y el stock termina en
 * -1. Eso es un TOCTOU de manual.
 *
 * La condición viaja DENTRO del update:
 *
 *     { _id, stock: { $gte: cantidad } }  →  { $inc: { stock: -cantidad } }
 *
 * MongoDB garantiza que la lectura y la escritura de UN documento son atómicas.
 * De dos compras simultáneas, una matchea y la otra no encuentra documento y
 * recibe `null`. No hay empate posible.
 *
 * Se eligió esto en lugar de transacciones porque una transacción de Mongo
 * exige un replica set: rompería el desarrollo local contra un mongod
 * standalone y obligaría a `MongoMemoryReplSet` en los tests. Y no compraría
 * nada: acá cada operación toca un documento a la vez, que es exactamente el
 * caso que el `$inc` condicional ya resuelve.
 */

/**
 * Aplica un delta al stock de un producto, de forma atómica, y lo asienta en
 * el libro mayor.
 *
 * @param {object}  args
 * @param {string}  args.productoId
 * @param {number}  args.delta       positivo suma, negativo resta
 * @param {string}  args.motivo      uno de MOTIVOS_MOVIMIENTO_STOCK
 * @param {string=} args.usuarioId   quién lo provocó (null para el sistema)
 * @param {string=} args.pedidoId
 * @param {string=} args.nota
 * @param {boolean=} args.registrar  `false` para reservas tentativas (ver abajo)
 *
 * @returns {Promise<object|null>} el producto YA actualizado, o `null` si la
 *   condición no se cumplió (no existe, o no hay stock suficiente para restar).
 *   Devolver `null` en vez de lanzar es a propósito: quien llama sabe si el
 *   caso es un 404, un 409 o algo que hay que compensar. Acá no se puede saber.
 */
async function aplicarMovimiento({
  productoId,
  delta,
  motivo,
  usuarioId = null,
  pedidoId = null,
  nota = '',
  registrar = true,
}) {
  // Restar exige stock suficiente; sumar no tiene condición que verificar.
  const filtro =
    delta < 0
      ? { _id: productoId, stock: { $gte: -delta } }
      : { _id: productoId }

  const producto = await Product.findOneAndUpdate(
    filtro,
    { $inc: { stock: delta } },
    { new: true }
  ).lean()

  if (!producto) return null

  if (registrar) {
    await StockMovement.create({
      producto: producto._id,
      nombreProducto: producto.nombre,
      cantidad: delta,
      motivo,
      usuario: usuarioId,
      pedido: pedidoId,
      stockResultante: producto.stock,
      nota,
    })
  }

  return producto
}

/**
 * Reserva stock para un pedido que TODAVÍA no existe.
 *
 * No asienta nada en el libro mayor (`registrar: false`), y esa es la
 * decisión importante: mientras el pedido no esté creado, el descuento es
 * tentativo. Si falla el tercer ítem hay que devolver los dos primeros, y un
 * libro mayor con "venta −2 / cancelación +2" de algo que nunca se vendió es
 * ruido que después nadie sabe leer. El ledger registra HECHOS CONSUMADOS.
 *
 * La venta se asienta con `registrarVenta()`, ya con el pedido creado y con su
 * id, que es lo que hace el movimiento rastreable.
 *
 * @returns {{ ok: true, reservados: Array } | { ok: false, fallo: object, reservados: Array }}
 */
async function reservarStock(items) {
  const reservados = []

  for (const item of items) {
    const producto = await aplicarMovimiento({
      productoId: item.producto,
      delta: -item.cantidad,
      motivo: 'venta',
      registrar: false,
    })

    if (!producto) {
      return {
        ok: false,
        fallo: { productoId: item.producto, cantidad: item.cantidad },
        reservados,
      }
    }

    reservados.push({ producto, cantidad: item.cantidad })
  }

  return { ok: true, reservados }
}

/**
 * Deshace una reserva tentativa. Tampoco asienta: ver `reservarStock`.
 *
 * Nunca lanza. Se la llama desde el camino de error, y un fallo acá taparía
 * el error original —que es el que el usuario necesita ver— con uno peor.
 * Si algo falla, se loguea y se sigue: el descuadre queda detectable
 * comparando `Product.stock` contra la suma del libro mayor.
 */
async function liberarReserva(reservados) {
  await Promise.all(
    reservados.map(({ producto, cantidad }) =>
      Product.updateOne(
        { _id: producto._id },
        { $inc: { stock: cantidad } }
      ).catch((error) => {
        console.error(
          `[stock] No se pudo liberar la reserva de ${producto._id}:`,
          error.message
        )
      })
    )
  )
}

/** Asienta las ventas de un pedido ya creado. Un movimiento por ítem. */
async function registrarVenta({ order, reservados, usuarioId }) {
  await StockMovement.insertMany(
    reservados.map(({ producto, cantidad }) => ({
      producto: producto._id,
      nombreProducto: producto.nombre,
      cantidad: -cantidad,
      motivo: 'venta',
      usuario: usuarioId,
      pedido: order._id,
      stockResultante: producto.stock,
      nota: '',
    }))
  )
}

/**
 * Devuelve al inventario las unidades de un pedido cancelado.
 *
 * Quien llama YA tiene que haber ganado el claim atómico de la cancelación
 * (ver `orders.controller.js`). Esta función no verifica idempotencia: si se
 * la invoca dos veces, devuelve el stock dos veces. El cerrojo está aguas
 * arriba, y tiene que estar ahí, porque es donde se decide quién cancela.
 */
async function devolverStockDePedido({ order, usuarioId }) {
  const devueltos = []

  for (const item of order.items) {
    const producto = await aplicarMovimiento({
      productoId: item.producto,
      delta: item.cantidad,
      motivo: 'cancelacion',
      usuarioId,
      pedidoId: order._id,
      nota: `Cancelación del pedido ${order._id}`,
    })

    if (!producto) {
      // El producto se borró del catálogo después de la compra. No hay dónde
      // devolver las unidades: se deja constancia y se sigue con el resto.
      // Frenar acá dejaría la cancelación a medias, que es peor.
      console.error(
        `[stock] Pedido ${order._id}: el producto ${item.producto} ya no existe, ` +
          `no se pudieron devolver ${item.cantidad} unidad(es)`
      )
      continue
    }

    devueltos.push({ productoId: producto._id, cantidad: item.cantidad })
  }

  return devueltos
}

module.exports = {
  aplicarMovimiento,
  reservarStock,
  liberarReserva,
  registrarVenta,
  devolverStockDePedido,
}
