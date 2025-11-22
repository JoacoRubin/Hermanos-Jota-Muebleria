const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API_URL = `${API_BASE}/api/orders`

class OrderService {
  static async createOrder(orderData) {
    const token = localStorage.getItem('token')
    
    if (!token) {
      throw new Error('No hay token de autenticación')
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.mensaje || 'Error al crear el pedido')
    }

    return response.json()
  }

  static async getUserOrders() {
    const token = localStorage.getItem('token')
    
    if (!token) {
      throw new Error('No hay token de autenticación')
    }

    const response = await fetch(`${API_URL}/mis-pedidos`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Error al obtener los pedidos')
    }

    return response.json()
  }

  static async getOrderById(orderId) {
    const token = localStorage.getItem('token')
    
    if (!token) {
      throw new Error('No hay token de autenticación')
    }

    const response = await fetch(`${API_URL}/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Error al obtener el pedido')
    }

    return response.json()
  }

  static async getAllOrders() {
    const token = localStorage.getItem('token')
    
    if (!token) {
      throw new Error('No hay token de autenticación')
    }

    const response = await fetch(`${API_URL}/admin/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Error al obtener todos los pedidos')
    }

    return response.json()
  }

  static async updateOrderStatus(orderId, nuevoEstado) {
    const token = localStorage.getItem('token')
    
    if (!token) {
      throw new Error('No hay token de autenticación')
    }

    const response = await fetch(`${API_URL}/${orderId}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ estado: nuevoEstado })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.mensaje || 'Error al actualizar el estado del pedido')
    }

    return response.json()
  }
}

export default OrderService
