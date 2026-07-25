/**
 * Catálogo inicial de Hermanos Jota.
 *
 * Vive en el backend a propósito. Antes `seed.js` hacía
 * `require('../../client/src/data/mockProducts')`, es decir: el backend
 * importaba un archivo de dentro del frontend. Eso rompía apenas se
 * desplegaba el backend solo (que es exactamente lo que hace Render con el
 * root dir en `backend/`), y además cruzaba ESM con CommonJS.
 *
 * Sin `_id`: los identificadores los genera MongoDB.
 */
const products = [
  {
    nombre: 'Aparador Uspallata',
    descripcion:
      'Aparador de seis puertas fabricado en nogal sostenible con tiradores metálicos en acabado latón. Su silueta minimalista realza el veteado natural de la madera, creando una pieza que combina funcionalidad y elegancia atemporal para espacios contemporáneos.',
    precio: 210000,
    stock: 2,
    categoria: 'Almacenamiento',
    imagenUrl: '/images/Aparador Uspallata.png',
    detalles: {
      Medidas: '180 × 45 × 75 cm',
      Materiales: 'Nogal macizo FSC®, herrajes de latón',
      Acabado: 'Aceite natural ecológico',
      Peso: '68 kg',
      Capacidad: '6 compartimentos interiores',
    },
  },
  {
    nombre: 'Butaca Mendoza',
    descripcion:
      'Butaca tapizada en boucle Dusty Rose con madera de guatambú seleccionada. Confort y diseño para cualquier ambiente.',
    precio: 95000,
    stock: 4,
    categoria: 'Sillas',
    imagenUrl: '/images/Butaca Mendoza.png',
    detalles: {
      Medidas: '80 × 75 × 85 cm',
      Materiales: 'Guatambú macizo, tela bouclé',
      Acabado: 'Cera vegetal, tapizado premium',
      Tapizado: 'Repelente al agua y manchas',
      Confort: 'Espuma alta densidad',
    },
  },
  {
    nombre: 'Sillón Copacabana',
    descripcion:
      'Sillón lounge en cuero cognac con base giratoria en acero Burnt Sienna. Inspirado en la estética brasilera moderna de los 60.',
    precio: 320000,
    stock: 1,
    categoria: 'Sofás',
    imagenUrl: '/images/Sillón Copacabana.png',
    detalles: {
      Medidas: '90 × 85 × 95 cm',
      Materiales: 'Cuero curtido vegetal, acero pintado',
      Acabado: 'Cuero anilina premium',
      Rotación: '360° silenciosa y suave',
      Garantía: '10 años en estructura',
    },
  },
  {
    nombre: 'Biblioteca Recoleta',
    descripcion:
      'Sistema modular de estantes abierto que combina estructura de acero Sage Green y repisas en roble claro. Perfecta para colecciones y objetos de diseño.',
    precio: 180000,
    stock: 3,
    categoria: 'Estanterías',
    imagenUrl: '/images/Biblioteca Recoleta.png',
    detalles: {
      Medidas: '100 × 35 × 200 cm',
      Materiales: 'Estructura de acero, estantes de roble',
      Acabado: 'Laca mate ecológica',
      Capacidad: '45 kg por estante',
      Modulares: '5 estantes ajustables',
    },
  },
  {
    nombre: 'Escritorio Costa',
    descripcion:
      'Escritorio compacto con cajón organizado y tapa pasacables integrada en bambú laminado, ideal para espacios pequeños.',
    precio: 180000,
    stock: 2,
    categoria: 'Escritorios',
    imagenUrl: '/images/Escritorio Costa.png',
    detalles: {
      Medidas: '120 × 60 × 75 cm',
      Materiales: 'Bambú laminado, herrajes ocultos',
      Acabado: 'Laca mate resistente',
      Almacenamiento: '1 cajón con organizador',
      Cables: 'Pasacables integrado',
    },
  },
  {
    nombre: 'Mesa de Centro Araucaria',
    descripcion:
      'Mesa de centro con sobre circular de mármol Patagonia y base de tres patas en madera de nogal. Diseño elegante y atemporal.',
    precio: 180000,
    stock: 2,
    categoria: 'Mesas',
    imagenUrl: '/images/Mesa de Centro Araucaria.png',
    detalles: {
      Medidas: '90 × 90 × 45 cm',
      Materiales: 'Sobre de mármol Patagonia, patas de nogal',
      Acabado: 'Mármol pulido, aceite natural en madera',
      Peso: '42 kg',
      'Carga máxima': '25 kg distribuidos',
    },
  },
  {
    nombre: 'Mesa de Noche Aconcagua',
    descripcion:
      'Mesa de noche con cajón oculto y repisa inferior en roble certificado FSC®. Su diseño limpio y funcional permite convivir con diferentes estilos de dormitorio.',
    precio: 85000,
    stock: 6,
    categoria: 'Mesas',
    imagenUrl: '/images/Mesa de Noche Aconcagua.png',
    detalles: {
      Medidas: '45 × 35 × 60 cm',
      Materiales: 'Roble macizo FSC®, herrajes soft-close',
      Acabado: 'Barniz mate de poliuretano',
      Almacenamiento: '1 cajón + repisa inferior',
      Características: 'Cajón con cierre suave',
    },
  },
  {
    nombre: 'Silla de Trabajo Belgrano',
    descripcion:
      'Silla ergonómica regulable en altura con respaldo de malla transpirable y asiento tapizado en tejido reciclado.',
    precio: 125000,
    stock: 8,
    categoria: 'Sillas',
    imagenUrl: '/images/Silla de Trabajo Belgrano.png',
    detalles: {
      Medidas: '60 × 60 × 90-100 cm',
      Materiales: 'Malla técnica, tejido reciclado',
      Acabado: 'Base cromada, tapizado premium',
      Regulación: 'Altura + inclinación respaldo',
      Certificación: 'Ergonomía europea EN 1335',
    },
  },
  {
    nombre: 'Mesa Comedor Pampa',
    descripcion:
      'Mesa extensible de roble macizo con tablero biselado y sistema de apertura suave. Su diseño robusto y elegante se adapta perfectamente a reuniones íntimas o grandes celebraciones familiares.',
    precio: 285000,
    stock: 1,
    categoria: 'Mesas',
    imagenUrl: '/images/Mesa Comedor Pampa.png',
    detalles: {
      Medidas: '160-240 × 90 × 75 cm',
      Materiales: 'Roble macizo FSC®, mecanismo alemán',
      Acabado: 'Aceite-cera natural',
      Capacidad: '6-10 comensales',
      Extensión: 'Sistema de mariposa central',
    },
  },
  {
    nombre: 'Sillas Córdoba',
    descripcion:
      'Set de cuatro sillas apilables en contrachapado moldeado de nogal y estructura tubular pintada en Sage Green.',
    precio: 140000,
    stock: 3,
    categoria: 'Sillas',
    imagenUrl: '/images/Sillas Córdoba.png',
    detalles: {
      Medidas: '45 × 52 × 80 cm (cada una)',
      Materiales: 'Contrachapado nogal, tubo de acero',
      Acabado: 'Laca mate, pintura epoxi',
      Apilables: 'Hasta 6 sillas',
      Incluye: 'Set de 4 sillas',
    },
  },
  {
    nombre: 'Sofá Patagonia',
    descripcion:
      'Sofá de tres cuerpos tapizado en lino Warm Alabaster con patas cónicas de madera.',
    precio: 245000,
    stock: 1,
    categoria: 'Sofás',
    imagenUrl: '/images/Sofá Patagonia.png',
    detalles: {
      Medidas: '220 × 90 × 80 cm',
      Estructura: 'Madera de eucalipto certificada FSC®',
      Tapizado: 'Lino 100% natural premium',
      Relleno: 'Espuma HR + plumón reciclado',
      Sostenibilidad: 'Materiales 100% reciclables',
    },
  },
]

module.exports = products
