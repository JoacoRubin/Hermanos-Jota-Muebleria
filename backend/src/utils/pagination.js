/**
 * Metadata de paginación consistente para todos los listados.
 *
 * Sin paginación, `Product.find()` y `Order.find()` traen la colección entera.
 * Con 12 productos no se nota; con 5.000 pedidos tumba el servicio.
 */
function buildMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

function skipFor({ page, limit }) {
  return (page - 1) * limit
}

module.exports = { buildMeta, skipFor }
