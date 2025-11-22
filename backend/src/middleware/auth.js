const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Middleware para verificar el token JWT
const authMiddleware = async (req, res, next) => {
  try {
    // Obtener el token del header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No autorizado. Token no proporcionado.' 
      })
    }

    // Extraer el token
    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ 
        message: 'No autorizado. Token no proporcionado.' 
      })
    }

    // Verificar el token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
    )

    // Buscar el usuario
    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({ 
        message: 'No autorizado. Usuario no encontrado.' 
      })
    }

    // Agregar el usuario a la request
    req.user = {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      role: user.role
    }

    next()
  } catch (error) {
    console.error('Error en middleware de autenticación:', error.message)
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' })
    }

    res.status(401).json({ message: 'No autorizado' })
  }
}

// Middleware para verificar si el usuario es admin
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'No autorizado. Debe iniciar sesión primero.' 
    })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Acceso denegado. Se requieren permisos de administrador.' 
    })
  }

  next()
}

module.exports = {
  authMiddleware,
  adminMiddleware
}
