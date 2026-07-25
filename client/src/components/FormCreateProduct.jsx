import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductService from '../services/productService'
import ModernLayout from './ModernLayout'
import { useUI } from '../contexts/UIContext'
import { CATEGORIAS } from '../constants'

/**
 * Alta de producto.
 *
 * Los nombres de los campos son los que espera la API: `nombre`,
 * `descripcion`, `precio`, `stock`, `categoria`, `imagenUrl`.
 *
 * El formulario anterior mandaba `name`, `description`, `price`, `category` e
 * `image` —ningún campo en común con el schema salvo `stock`—, así que
 * Mongoose descartaba todo y fallaba por `nombre` requerido. Este formulario
 * nunca pudo crear un producto.
 */
const ESTADO_INICIAL = {
  nombre: '',
  descripcion: '',
  precio: '',
  stock: '',
  categoria: '',
  imagenUrl: '',
}

function FormCreateProduct() {
  const navigate = useNavigate()
  const { toast, confirm } = useUI()

  const [formData, setFormData] = useState(ESTADO_INICIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (evento) => {
    const { name, value } = evento.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (evento) => {
    evento.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await ProductService.create({
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        // Los inputs numéricos entregan strings: la API exige números.
        precio: Number(formData.precio),
        stock: Number(formData.stock),
        categoria: formData.categoria,
        imagenUrl: formData.imagenUrl.trim(),
      })

      toast.success('¡Producto creado exitosamente!')
      navigate('/productos')
    } catch (err) {
      setError(err.detalle || err.message)
      toast.error('No se pudo crear el producto')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    const hayCambios = Object.values(formData).some((valor) => valor !== '')

    if (hayCambios) {
      const confirmado = await confirm({
        titulo: '¿Cancelar la carga?',
        mensaje: 'Se van a perder los cambios no guardados.',
        textoConfirmar: 'Sí, cancelar',
        textoCancelar: 'Seguir editando',
        peligroso: true,
      })
      if (!confirmado) return
    }

    navigate('/productos')
  }

  return (
    <ModernLayout title="Crear Nuevo Producto">
      <div className="content-card form-card">
        <h1 className="form-title">Crear Nuevo Producto</h1>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre del producto *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={120}
              placeholder="Ej: Silla Moderna de Madera"
            />
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción *</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              required
              rows={4}
              maxLength={2000}
              placeholder="Describí el producto…"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio">Precio (ARS) *</label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
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
                step="1"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoría *</label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar categoría</option>
              {CATEGORIAS.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="imagenUrl">URL de la imagen</label>
            <input
              type="text"
              id="imagenUrl"
              name="imagenUrl"
              value={formData.imagenUrl}
              onChange={handleChange}
              placeholder="https://ejemplo.com/imagen.jpg o /images/silla.png"
            />
            {formData.imagenUrl && (
              <div className="image-preview">
                <img
                  src={formData.imagenUrl}
                  alt="Vista previa del producto"
                  onError={(evento) => {
                    evento.target.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creando…' : 'Crear producto'}
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
    </ModernLayout>
  )
}

export default FormCreateProduct
