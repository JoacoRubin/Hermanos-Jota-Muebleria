/**
 * Envuelve un handler async para que cualquier rechazo llegue al error
 * handler de Express.
 *
 * Sin esto, un `await` que falla dentro de un handler async produce un
 * unhandled rejection y la petición queda colgada hasta el timeout: el
 * cliente nunca recibe respuesta.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = asyncHandler
