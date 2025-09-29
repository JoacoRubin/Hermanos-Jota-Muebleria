import productos from "../data/productos.js";

export const getProductos = (_req, res, next) => {
  try {
    res.json(productos);
  } catch (error) {
    next(error);
  }
};

export const getProductoById = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const producto = productos.find((p) => p.id === id);
    if (!producto) {
      const err = new Error(`Producto con id ${id} no encontrado`);
      err.status = 404;
      throw err;
    }
    res.json(producto);
  } catch (error) {
    next(error);
  }
};
