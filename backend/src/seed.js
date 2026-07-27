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
const StockMovement = require('./models/StockMovement')
const User = require('./models/User')
const productsSeed = require('./data/products.seed')
const { esBaseLocal, hostDe } = require('./utils/mongoUri')

const args = process.argv.slice(2)
const force = args.includes('--force')
const soloAdmin = args.includes('--admin')
const confirmadoRemoto = args.includes('--si-es-remota')

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
    // ──────────────────────────────────────────────────────────────────────
    // LA GUARDA MIRA A DÓNDE APUNTÁS, NO UN CARTEL QUE PODÉS OLVIDAR.
    //
    // Antes esto decía `if (env.isProduction)`. El problema: `NODE_ENV` es una
    // etiqueta de TU máquina, no una propiedad de la base. Con un
    // `$env:MONGO_URI` apuntando a Atlas y `NODE_ENV=development` en local
    // —que es el caso normal cuando alguien corre un script contra la base
    // real— la guarda no se disparaba y el `deleteMany` se llevaba puesto el
    // catálogo de producción.
    //
    // Peor todavía en este proyecto, donde desarrollo y producción comparten
    // la misma base: la condición vieja NUNCA iba a saltar.
    //
    // Ahora se mira el host de la URI. Si no es local, hay que decirlo
    // explícitamente con `--si-es-remota`. Un tipeo de más contra borrar el
    // catálogo real es un intercambio que conviene.
    // ──────────────────────────────────────────────────────────────────────
    if (!esBaseLocal(env.MONGO_URI) && !confirmadoRemoto) {
      throw new Error(
        `Negado: --force borra TODO el catálogo y la base no es local.\n` +
          `  Host: ${hostDe(env.MONGO_URI)}\n` +
          `  Base: ${mongoose.connection.name}\n` +
          `  Productos que se borrarían: ${existentes}\n\n` +
          'Si de verdad querés hacerlo, agregá --si-es-remota (y hacé backup antes):\n' +
          '  npm run seed -- --force --si-es-remota'
      )
    }

    await Product.deleteMany({})
    // Los movimientos del catálogo viejo apuntan a productos que ya no
    // existen: se limpian junto con ellos para que el libro mayor no quede
    // con filas huérfanas de una carga que se descartó entera.
    await StockMovement.deleteMany({})
    console.log(`${existentes} productos anteriores eliminados`)
  }

  const creados = await Product.insertMany(productsSeed)

  // El stock inicial es un movimiento como cualquier otro. Sin esto el libro
  // mayor arranca descuadrado contra `Product.stock` desde el día uno, y el
  // primer intento de auditar el inventario no cierra.
  const movimientos = creados
    .filter((producto) => producto.stock > 0)
    .map((producto) => ({
      producto: producto._id,
      nombreProducto: producto.nombre,
      cantidad: producto.stock,
      motivo: 'reposicion',
      usuario: null,
      stockResultante: producto.stock,
      nota: 'Carga inicial del catálogo (seed)',
    }))

  if (movimientos.length > 0) await StockMovement.insertMany(movimientos)

  console.log(
    `${creados.length} productos cargados correctamente ` +
      `(${movimientos.length} movimientos de stock inicial asentados)`
  )
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
