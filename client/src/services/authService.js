const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth`;

class AuthService {
  // Registrar nuevo usuario
  static async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar usuario');
      }

      // Guardar token en localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  // Login de usuario
  static async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar token en localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  // Logout
  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Obtener token almacenado
  static getToken() {
    return localStorage.getItem('token');
  }

  // Obtener usuario almacenado
  static getUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user:', error);
        return null;
      }
    }
    return null;
  }

  // Verificar si hay un usuario autenticado
  static isAuthenticated() {
    return !!this.getToken();
  }

  // Obtener perfil del usuario
  static async getProfile() {
    try {
      const token = this.getToken();
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al obtener perfil');
      }

      // Actualizar usuario en localStorage
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      throw error;
    }
  }

  // Verificar si el token es válido
  static async verifyToken() {
    try {
      const token = this.getToken();
      
      if (!token) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        this.logout();
        return false;
      }

      // Actualizar usuario en localStorage
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return true;
    } catch (error) {
      console.error('Error verificando token:', error);
      this.logout();
      return false;
    }
  }
}

export default AuthService;
