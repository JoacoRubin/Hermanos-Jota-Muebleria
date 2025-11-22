import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductService from '../services/productService'
import ModernLayout from './ModernLayout'

function FormCreateProduct() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    image: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Convertir precio y stock a números
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10)
      }

      await ProductService.createProduct(productData)
      alert('¡Producto creado exitosamente!')
      navigate('/productos')
    } catch (err) {
      setError('Error al crear el producto. Por favor, intenta nuevamente.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (window.confirm('¿Estás seguro de cancelar? Se perderán los cambios no guardados.')) {
      navigate('/productos')
    }
  }

  return (
    <ModernLayout title="Crear Nuevo Producto">
      <div className="product-detail-container">
        <div className="product-detail-card">
          <h2 className="form-title">Crear Nuevo Producto</h2>
          
          {error && (
            <div className="error-message" style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="product-form">
            <div className="form-group">
              <label htmlFor="name">Nombre del Producto *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ej: Silla Moderna de Madera"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="4"
                placeholder="Describe el producto..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">Precio (ARS) *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stock">Stock *</label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="category">Categoría *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar categoría</option>
                <option value="Sillas">Sillas</option>
                <option value="Mesas">Mesas</option>
                <option value="Sofás">Sofás</option>
                <option value="Camas">Camas</option>
                <option value="Escritorios">Escritorios</option>
                <option value="Estanterías">Estanterías</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="image">URL de la Imagen *</label>
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                required
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              {formData.image && (
                <div className="image-preview" style={{ marginTop: '1rem' }}>
                  <img 
                    src={formData.image} 
                    alt="Vista previa" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '200px', 
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="form-actions" style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '2rem' 
            }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Crear Producto'}
              </button>
              <button 
                type="button" 
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModernLayout>
  )
}

export default FormCreateProduct
