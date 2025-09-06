const productos = [
    {
        id: 1,
        nombre: "Aparador Uspallata",
        descripcion: "Aparador de seis puertas fabricado en nogal sostenible con tiradores metálicos en acabado latón. Su silueta minimalista realza el veteado natural de la madera, creando una pieza que combina funcionalidad y elegancia atemporal para espacios contemporáneos.",
        detalles: {
            "Medidas": "180 × 45 × 75 cm",
            "Materiales": "Nogal macizo FSC®, herrajes de latón",
            "Acabado": "Aceite natural ecológico",
            "Peso": "68 kg",
            "Capacidad": "6 compartimentos interiores"
        },
        precio: "$210.000",
        imagen: "Aparador Uspallata.png"
    },
    {
        id: 2,
        nombre: "Butaca Mendoza",
        descripcion: "Butaca tapizada en boucle Dusty Rose con madera de guatambú seleccionada. Confort y diseño para cualquier ambiente.",
        detalles: {
            "Medidas": "80 × 75 × 85 cm",
            "Materiales": "Guatambú macizo, tela bouclé",
            "Acabado": "Cera vegetal, tapizado premium",
            "Tapizado": "Repelente al agua y manchas",
            "Confort": "Espuma alta densidad"
        },
        precio: "$95.000",
        imagen: "Butaca Mendoza.png"
    },
    {
        id: 3,
        nombre: "Sillón Copacabana",
        descripcion: "Sillón lounge en cuero cognac con base giratoria en acero Burnt Sienna. Inspirado en la estética brasilera moderna de los 60.",
        detalles: {
            "Medidas": "90 × 85 × 95 cm",
            "Materiales": "Cuero curtido vegetal, acero pintado",
            "Acabado": "Cuero anilina premium",
            "Rotación": "360° silenciosa y suave",
            "Garantía": "10 años en estructura"
        },
        precio: "$320.000",
        imagen: "Sillón Copacabana.png"
    },
    {
        id: 4,
        nombre: "Biblioteca Recoleta",
        descripcion: "Sistema modular de estantes abierto que combina estructura de acero Sage Green y repisas en roble claro. Perfecta para colecciones y objetos de diseño.",
        detalles: {
            "Medidas": "100 × 35 × 200 cm",
            "Materiales": "Estructura de acero, estantes de roble",
            "Acabado": "Laca mate ecológica",
            "Capacidad": "45 kg por estante",
            "Modulares": "5 estantes ajustables"
        },
        precio: "$180.000",
        imagen: "Biblioteca Recoleta.png"
    },
    {
        id: 5,
        nombre: "Escritorio Costa",
        descripcion: "Escritorio compacto con cajón organizado y tapa pasacables integrada en bambú laminado, ideal para espacios pequeños.",
        detalles: {
            "Medidas": "120 × 60 × 75 cm",
            "Materiales": "Bambú laminado, herrajes ocultos",
            "Acabado": "Laca mate resistente",
            "Almacenamiento": "1 cajón con organizador",
            "Cables": "Pasacables integrado"
        },
        precio: "$180.000",
        imagen: "Escritorio Costa.png"
    },
    {
        id: 6,
        nombre: "Mesa de Centro Araucaria",
        descripcion: "Mesa de centro con sobre circular de mármol Patagonia y base de tres patas en madera de nogal. Diseño elegante y atemporal.",
        detalles: {
            "Medidas": "90 × 90 × 45 cm",
            "Materiales": "Sobre de mármol Patagonia, patas de nogal",
            "Acabado": "Mármol pulido, aceite natural en madera",
            "Peso": "42 kg",
            "Carga máxima": "25 kg distribuidos"
        },
        precio: "$180.000",
        imagen: "Mesa de Centro Araucaria.png"
    },
    {
        id: 7,
        nombre: "Mesa de Noche Aconcagua",
        descripcion: "Mesa de noche con cajón oculto y repisa inferior en roble certificado FSC®. Su diseño limpio y funcional permite convivir con diferentes estilos de dormitorio.",
        detalles: {
            "Medidas": "45 × 35 × 60 cm",
            "Materiales": "Roble macizo FSC®, herrajes soft-close",
            "Acabado": "Barniz mate de poliuretano",
            "Almacenamiento": "1 cajón + repisa inferior",
            "Características": "Cajón con cierre suave"
        },
        precio: "$180.000",
        imagen: "Mesa de Noche Aconcagua.png"
    },
    {
        id: 8,
        nombre: "Silla de Trabajo Belgrano",
        descripcion: "Silla ergonómica regulable en altura con respaldo de malla transpirable y asiento tapizado en tejido reciclado.",
        detalles: {
            "Medidas": "60 × 60 × 90-100 cm",
            "Materiales": "Malla técnica, tejido reciclado",
            "Acabado": "Base cromada, tapizado premium",
            "Regulación": "Altura + inclinación respaldo",
            "Certificación": "Ergonomía europea EN 1335"
        },
        precio: "$180.000",
        imagen: "Silla de Trabajo Belgrano.png"
    },
    {
        id: 9,
        nombre: "Mesa Comedor Pampa",
        descripcion: "Mesa extensible de roble macizo con tablero biselado y sistema de apertura suave. Su diseño robusto y elegante se adapta perfectamente a reuniones íntimas o grandes celebraciones familiares.",
        detalles: {
            "Medidas": "160-240 × 90 × 75 cm",
            "Materiales": "Roble macizo FSC®, mecanismo alemán",
            "Acabado": "Aceite-cera natural",
            "Capacidad": "6-10 comensales",
            "Extensión": "Sistema de mariposa central"
        },
        precio: "$180.000",
        imagen: "Mesa Comedor Pampa.png"
    },
    {
        id: 10,
        nombre: "Sillas Córdoba",
        descripcion: "Set de cuatro sillas apilables en contrachapado moldeado de nogal y estructura tubular pintada en Sage Green.",
        detalles: {
            "Medidas": "45 × 52 × 80 cm (cada una)",
            "Materiales": "Contrachapado nogal, tubo de acero",
            "Acabado": "Laca mate, pintura epoxi",
            "Apilables": "Hasta 6 sillas",
            "Incluye": "Set de 4 sillas"
        },
        precio: "$180.000",
        imagen: "Sillas Córdoba.png"
    },
    {
        id: 11,
        nombre: "Sofá Patagonia",
        descripcion: "Sofá de tres cuerpos tapizado en lino Warm Alabaster con patas cónicas de madera.",
        detalles: {
            "Medidas": "220 × 90 × 80 cm",
            "Estructura": "Madera de eucalipto certificada FSC®",
            "Tapizado": "Lino 100% natural premium",
            "Relleno": "Espuma HR + plumón reciclado",
            "Sostenibilidad": "Materiales 100% reciclables"
        },
        precio: "$180.000",
        imagen: "Sofá Patagonia.png"
    }
];
function obtenerProductos() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(productos);
        }, 800); 
    });
}

// Incrementa el contador del carrito al hacer clic en "Añadir al Carrito"
document.addEventListener('DOMContentLoaded', () => {
    const contador = document.getElementById('carrito-contador');
    function actualizarContador() {
        const cant = parseInt(localStorage.getItem('carrito') || '0');
        if (contador) contador.textContent = cant;
    }
    actualizarContador();
    window.addEventListener('storage', actualizarContador);

    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('producto-btn')) {
            let cant = parseInt(localStorage.getItem('carrito') || '0');
            localStorage.setItem('carrito', cant + 1);
            actualizarContador();
        }
        // Disminuir carrito
        if (e.target.classList.contains('producto-btn-disminuir')) {
            let cant = parseInt(localStorage.getItem('carrito') || '0');
            if (cant>0){
                localStorage.setItem('carrito',cant-1);
                actualizarContador();
            }
        }

    });
});