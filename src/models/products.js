const mongoose = require('mongoose');

// Definimos el Esquema (Schema) del producto
const productSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true, 
        trim: true 
    },
    descripcion: {
        type: String, 
        trim: true
    },
    precio: {
        type: Number,
        required: true 
    },
    stock: {
        type: Number, 
        default: 0 
    },
    imagenUrl: {
        type: String, 
        trim: true
    }
});

// Creamos y exportamos el Modelo a partir del Esquema
const Product = mongoose.model('Product', productSchema);

// Usamos module.exports en lugar de export default
module.exports = Product; 