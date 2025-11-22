const User = require('../models/User')
const jwt = require('jsonwebtoken')

// Generar JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback-secret-key-change-in-production', {
    expiresIn: '30d'
  })
}

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body

    // Validar que todos los campos estén presentes
    if (!nombre || !email || !password) {
      return res.status(400).json({ 
        message: 'Por favor proporcione nombre, email y contraseña' 
      })
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ 
        message: 'El email ya está registrado' 
      })
    }

    // Crear nuevo usuario (la contraseña se hashea automáticamente en el modelo)
    const user = new User({
      nombre,
      email,
      password
    })

    await user.save()

    // Generar token
    const token = generateToken(user._id)

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error en registro:', error)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }
    next(error)
  }
}

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Por favor proporcione email y contraseña' 
      })
    }

    // Buscar usuario
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ 
        message: 'Credenciales inválidas' 
      })
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Credenciales inválidas' 
      })
    }

    // Generar token
    const token = generateToken(user._id)

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error en login:', error)
    next(error)
  }
}

// @desc    Obtener perfil del usuario autenticado
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    // req.user viene del middleware de autenticación
    const user = await User.findById(req.user.id).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    res.json({
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Error obteniendo perfil:', error)
    next(error)
  }
}

// @desc    Verificar token
// @route   GET /api/auth/verify
// @access  Private
exports.verifyToken = async (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (validado por el middleware)
    const user = await User.findById(req.user.id).select('-password')
    
    if (!user) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Usuario no encontrado' 
      })
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(401).json({ 
      valid: false, 
      message: 'Token inválido' 
    })
  }
}
