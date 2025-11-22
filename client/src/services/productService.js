import { mockProducts } from '../data/mockProducts.js';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

class ProductService {
  // Obtener todos los productos
  static async getAllProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/productos`);
      if (!response.ok) {
        throw new Error('Error al obtener productos');
      }
      return await response.json();
    } catch (error) {
      console.warn('Backend no disponible, usando productos de ejemplo:', error.message);
      // Retornar productos mock si el backend no está disponible
      return new Promise(resolve => {
        setTimeout(() => resolve(mockProducts), 500); // Simula delay de red
      });
    }
  }

  // Obtener un producto por ID
  static async getProductById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/productos/${id}`);
      if (!response.ok) {
        throw new Error('Error al obtener el producto');
      }
      return await response.json();
    } catch (error) {
      console.warn('Backend no disponible, buscando en productos de ejemplo:', error.message);
      // Buscar en productos mock si el backend no está disponible
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const product = mockProducts.find(p => p._id === id);
          if (product) {
            resolve(product);
          } else {
            reject(new Error('Producto no encontrado'));
          }
        }, 300);
      });
    }
  }

  // Actualizar un producto
  static async updateProduct(id, productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar el producto');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Eliminar un producto
  static async deleteProduct(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/productos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar el producto');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Crear un nuevo producto
  static async createProduct(productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/productos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        throw new Error('Error al crear el producto');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }


}

export default ProductService;