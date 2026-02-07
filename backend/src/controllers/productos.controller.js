const Product = require('../models/Product')

exports.getAll = async (req, res, next) => {
  try {
    console.log('[GET /api/productos] Iniciando consulta...')
    const startTime = Date.now()
    
    const products = await Product.find()
      .lean()
      .maxTimeMS(10000) // Timeout de 10 segundos
      .select('-__v') // Excluir campo de versión para reducir payload
    
    const queryTime = Date.now() - startTime
    console.log(`[GET /api/productos] Completado en ${queryTime}ms - ${products.length} productos encontrados`)
    
    // Cache por 5 minutos en producción
    if (process.env.NODE_ENV === 'production') {
      res.set('Cache-Control', 'public, max-age=300')
    }
    
    res.json(products)
  } catch (err) {
    console.error('[GET /api/productos] Error:', err.message)
    next(err)
  }
}

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await Product.findById(id).lean()
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' })
    res.json(product)
  } catch (err) {
    next(err)
  }
}

exports.create = async (req, res, next) => {
  try {
    const data = req.body
    const newProduct = new Product(data)
    await newProduct.save()
    res.status(201).json(newProduct)
  } catch (err) {
    next(err)
  }
}

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params
    const data = req.body
    const updated = await Product.findByIdAndUpdate(id, data, { new: true })
    if (!updated) return res.status(404).json({ message: 'Producto no encontrado' })
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params
    const removed = await Product.findByIdAndDelete(id)
    if (!removed) return res.status(404).json({ message: 'Producto no encontrado' })
    res.json({ message: 'Producto eliminado' })
  } catch (err) {
    next(err)
  }
}
