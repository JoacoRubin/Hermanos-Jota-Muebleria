import Product from "../models/Products";

export const getProductos = async (_req, res, next) => {
  try {
    const producto = await Product.find();
    res.json(producto);
  } catch (error) {
    next(error);
  }
};

export const getProductoById = async (req, res, next) => {
  try {
    const producto = await Product.findById(req.params.id);
    if (!producto) {
      const err = new Error(`Producto con id ${req.params.id} no encontrado`);
      err.status = 404;
      throw err;
    }
    res.json(producto);
  } catch (error) {
    next(error);
  }
};

export const createProducto = async (req, res, next) => {
  try {
    const nuevoProducto = new Product (req.body);
    const productoGuardado = await nuevoProducto.save();
    res.status(201).json({
      mensaje: 'Producto creado con exito',
      producto: productoGuardado
    });
  } catch(error) {
    console.error('Error el crear el producto: ',error.message);
    error.status= 400;
    next(error);
  }
};

export const updateProducto = async (req, res, next) => {
  try{
    const productoActualizado = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {new: true, runValidators: true }
    );
    if(!productoActualizado){
      const err = new Error(`Producto con id ${req.params.id} no encontrado`);
      err.status = 404;
      throw err;
    }
    res.json(productoActualizado);
  } catch(error) {
    next(error);
  }
};

export const deleteProducto = async (req, res, next) => {
  try{
    const productoEliminado = await Product.findByIdAndDelete(req.params.id);
    if(!productoEliminado){
      const err = new Error(`Producto con id ${req.params.id} no encontrado`);
      err.status = 404;
      throw err;
    }
    res.json({ mensaje: "Producto eliminado correctamente" });
  } catch(error) {
    next(error);
  }
};

