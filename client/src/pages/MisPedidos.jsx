import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import OrderService from '../services/orderService'
import ModernLayout from '../components/ModernLayout'

function MisPedidos() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await OrderService.getUserOrders()
      setOrders(data.pedidos || [])
      setError(null)
    } catch (err) {
      console.error('Error al cargar pedidos:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getEstadoBadgeColor = (estado) => {
    const colors = {
      'pendiente': '#FFA500',
      'procesando': '#2196F3',
      'enviado': '#9C27B0',
      'entregado': '#4CAF50',
      'cancelado': '#F44336'
    }
    return colors[estado] || '#757575'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <ModernLayout>
        <div className="content-card">
          <h1>Mis Pedidos</h1>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p>Cargando pedidos...</p>
          </div>
        </div>
      </ModernLayout>
    )
  }

  if (error) {
    return (
      <ModernLayout>
        <div className="content-card">
          <h1>Mis Pedidos</h1>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: 'var(--rosa-polvoriento)' }}>Error: {error}</p>
            <button onClick={loadOrders} className="explore-button" style={{ marginTop: '1rem' }}>
              Reintentar
            </button>
          </div>
        </div>
      </ModernLayout>
    )
  }

  if (orders.length === 0) {
    return (
      <ModernLayout>
        <div className="content-card">
          <h1>Mis Pedidos</h1>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
            <h2>No tienes pedidos aún</h2>
            <p>Comienza a explorar nuestro catálogo</p>
            <Link to="/productos" className="explore-button" style={{ marginTop: '2rem' }}>
              Ver Productos
            </Link>
          </div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="content-card">
        <h1>Mis Pedidos</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {orders.map((order) => (
            <div 
              key={order._id} 
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid rgba(160, 82, 45, 0.1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(160, 82, 45, 0.1)'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--siena-tostado)' }}>
                    Pedido #{order._id.slice(-8).toUpperCase()}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--texto-secundario)', fontSize: '0.9rem' }}>
                    {formatDate(order.fechaPedido)}
                  </p>
                </div>
                <span 
                  style={{ 
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    backgroundColor: getEstadoBadgeColor(order.estado),
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}
                >
                  {order.estado}
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--siena-tostado)' }}>
                  Productos ({order.cantidadTotal} {order.cantidadTotal === 1 ? 'artículo' : 'artículos'})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {order.items.map((item, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        backgroundColor: 'rgba(160, 82, 45, 0.05)',
                        borderRadius: '6px'
                      }}
                    >
                      <span>
                        {item.nombre} <span style={{ color: 'var(--texto-secundario)' }}>x{item.cantidad}</span>
                      </span>
                      <span style={{ fontWeight: '600', color: 'var(--siena-tostado)' }}>
                        ${(item.precio * item.cantidad).toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(160, 82, 45, 0.1)'
              }}>
                <div>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--texto-secundario)' }}>
                    📍 Envío a:
                  </p>
                  <p style={{ margin: 0, fontWeight: '500' }}>
                    {order.direccionEnvio}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--texto-secundario)' }}>
                    Total
                  </p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: 'var(--siena-tostado)' }}>
                    ${order.total.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModernLayout>
  )
}

export default MisPedidos
