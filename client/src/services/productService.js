import { mockProducts } from '../data/mockProducts.js';
import { fetchWithRetry } from '../utils/fetchWithTimeout.js';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

class ProductService {
  // Obtener todos los productos
  static async getAllProducts() {
    try {
      console.log('[ProductService] Cargando productos desde:', `${API_BASE_URL}/productos`);
      const startTime = Date.now();
      
      const response = await fetchWithRetry(`${API_BASE_URL}/productos`, {}, 2);
      const data = await response.json();
      
      const loadTime = Date.now() - startTime;
      console.log(`[ProductService] ✓ Productos cargados en ${loadTime}ms`);
      
      return data;
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
      const response = await fetchWithRetry(`${API_BASE_URL}/productos/${id}`, {}, 1);
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
      const response = await fetchWithRetry(`${API_BASE_URL}/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      }, 1);
      
      return await response.json();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Eliminar un producto
  static async deleteProduct(id) {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/productos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 1);
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Crear un nuevo producto
  static async createProduct(productData) {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/productos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      }, 1);
      
      return await response.json();
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }


}

export default ProductService;