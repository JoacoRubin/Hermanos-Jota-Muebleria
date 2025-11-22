const Order = require('../models/Order')

// @desc    Crear un nuevo pedido
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { items, direccionEnvio, notas } = req.body
    
    // Validar que haya items
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        mensaje: 'El pedido debe contener al menos un producto' 
      })
    }

    // Validar dirección de envío
    if (!direccionEnvio || direccionEnvio.trim() === '') {
      return res.status(400).json({ 
        mensaje: 'La dirección de envío es obligatoria' 
      })
    }

    // Calcular el total
    const total = items.reduce((sum, item) => {
      return sum + (item.precio * item.cantidad)
    }, 0)

    // Crear el pedido asociado al usuario autenticado
    const order = new Order({
      usuario: req.user.id, // Viene del middleware de autenticación
      items,
      total,
      direccionEnvio: direccionEnvio.trim(),
      notas
    })

    await order.save()

    // Poblar la información del usuario
    await order.populate('usuario', 'nombre email')

    res.status(201).json({
      mensaje: 'Pedido creado exitosamente',
      pedido: order
    })
  } catch (error) {
    console.error('Error creando pedido:', error)
    res.status(500).json({ 
      mensaje: error.message || 'Error al crear el pedido' 
    })
  }
}

// @desc    Obtener pedidos del usuario autenticado
// @route   GET /api/orders/mis-pedidos
// @access  Private
exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ usuario: req.user.id })
      .sort({ createdAt: -1 }) // Más recientes primero
      .populate('usuario', 'nombre email')

    res.json({
      count: orders.length,
      pedidos: orders
    })
  } catch (error) {
    console.error('Error obteniendo pedidos:', error)
    res.status(500).json({ 
      mensaje: error.message || 'Error al obtener los pedidos' 
    })
  }
}

// @desc    Obtener un pedido específico del usuario
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('usuario', 'nombre email')
      .populate('items.producto')

    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' })
    }

    // Verificar que el pedido pertenezca al usuario autenticado
    if (order.usuario._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'No tienes permiso para ver este pedido' 
      })
    }

    res.json({ order })
  } catch (error) {
    console.error('Error obteniendo pedido:', error)
    next(error)
  }
}

// @desc    Actualizar estado de un pedido (solo admin)
// @route   PUT /api/orders/:id/estado
// @access  Private/Admin
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { estado } = req.body
    
    const validEstados = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado']
    if (!validEstados.includes(estado)) {
      return res.status(400).json({ 
        message: 'Estado inválido' 
      })
    }

    const order = await Order.findById(req.params.id)
    
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' })
    }

    order.estado = estado
    await order.save()

    res.json({
      message: 'Estado del pedido actualizado',
      order
    })
  } catch (error) {
    console.error('Error actualizando pedido:', error)
    next(error)
  }
}

// @desc    Obtener todos los pedidos (solo admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('usuario', 'nombre email')

    res.json({
      count: orders.length,
      orders
    })
  } catch (error) {
    console.error('Error obteniendo todos los pedidos:', error)
    next(error)
  }
}
