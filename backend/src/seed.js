/**
 * Carga el catálogo inicial y, opcionalmente, crea la cuenta de administrador.
 *
 *   npm run seed                  → carga productos si la colección está vacía
 *   npm run seed -- --force       → borra y recarga el catálogo
 *   npm run seed:admin            → crea/promueve el admin definido en el .env
 *
 * El borrado NO es el comportamiento por defecto: la versión anterior hacía
 * `deleteMany({})` sin preguntar, así que correr el seed por costumbre contra
 * la base de producción se llevaba puesto el catálogo real.
 */
require('dotenv').config()

const mongoose = require('mongoose')
const { env } = require('./config')
const { connectDatabase, disconnectDatabase } = require('./config/db')
const Product = require('./models/Product')
const User = require('./models/User')
const productsSeed = require('./data/products.seed')

const args = process.argv.slice(2)
const force = args.includes('--force')
const soloAdmin = args.includes('--admin')

async function seedProductos() {
  const existentes = await Product.countDocuments()

  if (existentes > 0 && !force) {
    console.log(
      `Ya hay ${existentes} productos en la base. Nada que hacer.\n` +
        'Si querés reemplazar el catálogo: npm run seed -- --force'
    )
    return
  }

  if (existentes > 0) {
    if (env.isProduction) {
      throw new Error(
        'Negado: --force borra el catálogo y NODE_ENV es "production". ' +
          'Si de verdad querés hacerlo, hacelo a mano y con backup.'
      )
    }
    await Product.deleteMany({})
    console.log(`${existentes} productos anteriores eliminados`)
  }

  const creados = await Product.insertMany(productsSeed)
  console.log(`${creados.length} productos cargados correctamente`)
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    console.log(
      'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no configurados: se omite el admin.'
    )
    return
  }

  const existente = await User.findOne({ email: email.toLowerCase() })

  if (existente) {
    if (existente.role === 'admin') {
      console.log(`El usuario ${email} ya es administrador`)
      return
    }
    existente.role = 'admin'
    await existente.save({ validateBeforeSave: false })
    console.log(`Usuario ${email} promovido a administrador`)
    return
  }

  // El hash lo hace el hook pre('save') del modelo.
  await User.create({
    nombre: process.env.SEED_ADMIN_NOMBRE || 'Administrador',
    email,
    password,
    role: 'admin',
  })
  console.log(`Administrador ${email} creado`)
}

async function main() {
  await connectDatabase(env.MONGO_URI)

  if (soloAdmin) {
    await seedAdmin()
  } else {
    await seedProductos()
    await seedAdmin()
  }

  await disconnectDatabase()
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('\nError durante el seed:', error.message)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
