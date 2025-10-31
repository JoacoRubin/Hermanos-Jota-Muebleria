// Script para cargar productos mock en MongoDB Atlas
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const mockProducts = require('../../client/src/data/mockProducts').default;

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado a MongoDB');

    // Elimina todos los productos existentes
    await Product.deleteMany({});
    console.log('Productos anteriores eliminados');

    // Inserta los productos mock
    await Product.insertMany(mockProducts.map(p => {
      // Elimina el campo _id para evitar conflictos
      const { _id, ...rest } = p;
      return rest;
    }));
    console.log('Productos mock insertados correctamente');
    process.exit(0);
  } catch (err) {
    console.error('Error al cargar productos:', err);
    process.exit(1);
  }
}

seed();
