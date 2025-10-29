# Catálogo de Productos - Frontend React

## Descripción
Aplicación frontend desarrollada en React que implementa un catálogo de productos con funcionalidades completas de CRUD (Create, Read, Update, Delete) que se conecta con una API backend.

## Tecnologías Utilizadas
- **React 18** - Framework de JavaScript para interfaces de usuario
- **React Router DOM 6** - Gestión de enrutamiento y navegación
- **Vite** - Herramienta de construcción y desarrollo rápido
- **CSS Modules** - Estilos modulares y componentes

## Características Principales

### 🎯 Enrutamiento Completo
- `/` - Página de inicio con bienvenida
- `/productos` - Catálogo completo de productos
- `/productos/:id` - Página de detalle de producto específico
- `/contacto` - Formulario de contacto
- `/admin/crear-producto` - Formulario para crear nuevos productos

### 📡 Integración con API
- **Consumo de API REST** para obtener productos
- **Gestión de estados** de carga y error
- **Operaciones CRUD** completas:
  - GET: Listar todos los productos
  - GET: Obtener producto por ID
  - POST: Crear nuevo producto
  - DELETE: Eliminar producto

### 🎨 Interfaz de Usuario
- **Diseño responsive** adaptable a diferentes dispositivos
- **Navegación intuitiva** con menú principal
- **Estados visuales** para carga, error y éxito
- **Confirmaciones** para acciones destructivas

## Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   └── Navbar.jsx      # Barra de navegación principal
├── pages/              # Páginas principales de la aplicación
│   ├── Home.jsx        # Página de inicio
│   ├── Products.jsx    # Catálogo de productos
│   ├── ProductDetail.jsx # Detalle de producto individual
│   ├── Contact.jsx     # Formulario de contacto
│   └── CreateProduct.jsx # Formulario de creación de productos
├── services/           # Servicios para comunicación con API
│   └── productService.js # Cliente para operaciones de productos
├── App.jsx            # Componente principal con rutas
├── main.jsx           # Punto de entrada de la aplicación
└── index.css          # Estilos globales
```

## Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm (viene incluido con Node.js)

### Pasos de Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   - La aplicación está configurada para conectarse al backend en `http://localhost:5000`
   - Asegúrate de que tu API backend esté ejecutándose en el puerto 5000

3. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

## Funcionalidades Detalladas

### 📋 Catálogo de Productos (`/productos`)
- Lista todos los productos disponibles
- Muestra información básica: nombre, descripción, precio y stock
- Imágenes de productos (si están disponibles)
- Enlaces a páginas de detalle individuales
- Manejo de estados de carga y error
- Botón para agregar nuevos productos

### 🔍 Detalle de Producto (`/productos/:id`)
- Vista completa de un producto específico
- Información detallada del producto
- **Funcionalidad de eliminación** con confirmación
- Navegación de regreso al catálogo
- Manejo de productos no encontrados

### ➕ Crear Producto (`/admin/crear-producto`)
- Formulario controlado con validación
- Campos obligatorios y opcionales
- Vista previa de imágenes
- Validaciones en tiempo real
- Redirección automática tras creación exitosa

### 📞 Contacto (`/contacto`)
- Formulario de contacto completo
- Validación de campos obligatorios
- Confirmación visual de envío
- Información de contacto adicional

## Configuración de la API

El frontend está configurado para comunicarse con un backend que debe proporcionar los siguientes endpoints:

```
GET    /api/productos      # Obtener todos los productos
GET    /api/productos/:id  # Obtener producto por ID
POST   /api/productos      # Crear nuevo producto
PUT    /api/productos/:id  # Actualizar producto
DELETE /api/productos/:id  # Eliminar producto
```

## Scripts Disponibles

- `npm run dev` - Ejecuta la aplicación en modo desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Vista previa de la construcción de producción
- `npm run lint` - Ejecuta el linter para verificar calidad de código

## Consideraciones de Desarrollo

### Gestión de Estados
- Uso de hooks `useState` y `useEffect` para manejo local de estado
- Estados separados para loading, error y data en cada componente

### Navegación
- Implementación completa de React Router DOM v6
- Uso de `useParams` para parámetros dinámicos
- `useNavigate` para redirecciones programáticas

### Manejo de Errores
- Try-catch blocks en todas las llamadas a la API
- Estados de error visuales para el usuario
- Fallbacks para imágenes no disponibles

### Experiencia de Usuario
- Estados de carga durante operaciones asíncronas
- Confirmaciones para acciones destructivas
- Navegación intuitiva entre páginas


- Verifica que el servidor API esté ejecutándose en el puerto correcto
- Asegúrate de que las dependencias estén instaladas correctamente

---

**Versión**: 1.0.0  
**Fecha de última actualización**: Octubre 2025
