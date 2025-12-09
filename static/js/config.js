// /home/genichurro/Documentos/IA/static/js/config.js
// Configuración de la aplicación (Modificado para usar API de Flask en el puerto 5000)

const CONFIG = {
    // RUTA UNIFICADA DE API: Ahora apunta a Flask en el puerto 5000 y a la ruta /api
    API_URL: '/api',
    
    // Credenciales de demo para el admin
    DEMO_EMAIL: 'admin@bosbeauty.com',
    DEMO_PASSWORD: 'admin123',
    
    // Almacenamiento local
    STORAGE_KEYS: {
        CART: 'bos_beauty_cart',
        AUTH_TOKEN: 'bos_beauty_auth',
        USER_EMAIL: 'bos_beauty_user'
    },
    
    // Categorías de productos
    CATEGORIES: {
        jabones: 'Jabones',
        serums: 'Serums',
        shampoos: 'Shampoos',
        acondicionadores: 'Acondicionadores',
        cremas: 'Cremas',
        aceites: 'Aceites'
    }
};

// Los productos por defecto (se mantienen sin cambios)
const DEFAULT_PRODUCTS = [
    // Jabones
    {
        id: 1,
        name: "Sueños de Lavanda",
        price: 12.99,
        image: "https://images.unsplash.com/photo-1563398643312-ae05ad974668?w=400",
        description: "Jabón calmante de lavanda con aceites esenciales para una experiencia de baño relajante.",
        category: "jabones",
        stock: 25,
        featured: true,
        ingredients: ["Aceite de oliva", "Aceite de coco", "Aceite esencial de lavanda", "Lavanda seca"]
    },
    {
        id: 2,
        name: "Frescura de Eucalipto",
        price: 13.99,
        image: "https://images.unsplash.com/photo-1601264116122-a4a0a79a3fec?w=400",
        description: "Jabón vigorizante de eucalipto que refresca y despierta tus sentidos.",
        category: "jabones",
        stock: 30,
        featured: false,
        ingredients: ["Manteca de karité", "Aceite de eucalipto", "Aceite de árbol de té", "Colorantes naturales"]
    },
    {
        id: 3,
        name: "Jardín de Rosas",
        price: 15.99,
        image: "https://images.unsplash.com/photo-1688233944791-44d8c8e9bfd9?w=400",
        description: "Lujoso jabón de pétalos de rosa con propiedades hidratantes para una piel suave y tersa.",
        category: "jabones",
        stock: 20,
        featured: true,
        ingredients: ["Pétalos de rosa", "Aceite de rosa mosqueta", "Glicerina", "Aceite de almendras dulces"]
    },
    {
        id: 4,
        name: "Avena y Miel",
        price: 11.99,
        image: "https://images.unsplash.com/photo-1609344553637-ee6623677e3d?w=400",
        description: "Jabón exfoliante suave con avena y miel para pieles sensibles.",
        category: "jabones",
        stock: 35,
        featured: false,
        ingredients: ["Avena", "Miel pura", "Leche de cabra", "Extracto de vainilla"]
    },
    // Serums
    {
        id: 101,
        name: "Serum Vitamina C",
        price: 24.99,
        image: "https://images.unsplash.com/photo-1723951174326-2a97221d3b7f?w=400",
        description: "Serum iluminador con vitamina C para una piel radiante y uniforme.",
        category: "serums",
        stock: 15,
        featured: true,
        ingredients: ["Vitamina C", "Ácido hialurónico", "Vitamina E", "Extracto de naranja"]
    },
    {
        id: 102,
        name: "Serum Ácido Hialurónico",
        price: 22.99,
        image: "https://images.unsplash.com/photo-1665763630810-e6251bdd392d?w=400",
        description: "Hidratación profunda con ácido hialurónico de triple peso molecular.",
        category: "serums",
        stock: 18,
        featured: false,
        ingredients: ["Ácido hialurónico", "Glicerina", "Aloe vera", "Péptidos"]
    },
    // Shampoos
    {
        id: 201,
        name: "Shampoo Hidratante",
        price: 18.99,
        image: "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400",
        description: "Shampoo sin sulfatos con aceite de argán para cabello seco.",
        category: "shampoos",
        stock: 22,
        featured: false,
        ingredients: ["Aceite de argán", "Keratina", "Proteína de trigo", "Aloe vera"]
    },
    {
        id: 202,
        name: "Shampoo Volumen",
        price: 17.99,
        image: "https://images.unsplash.com/photo-1637523861607-a6b7c6f9fe02?w=400",
        description: "Da volumen y cuerpo al cabello fino con extracto de bambú.",
        category: "shampoos",
        stock: 28,
        featured: false,
        ingredients: ["Extracto de bambú", "Biotina", "Colágeno", "Pantenol"]
    },
    // Acondicionadores
    {
        id: 301,
        name: "Acondicionador Reparador",
        price: 19.99,
        image: "https://images.unsplash.com/photo-1686121544103-f1bc403bd6da?w=400",
        description: "Repara el cabello dañado con keratina y proteínas.",
        category: "acondicionadores",
        stock: 20,
        featured: false,
        ingredients: ["Keratina", "Proteína de seda", "Aceite de argán", "Ceramidas"]
    },
    // Cremas
    {
        id: 401,
        name: "Crema Facial Hidratante",
        price: 26.99,
        image: "https://images.unsplash.com/photo-1585652757146-e9d00bf2810c?w=400",
        description: "Hidratación 24 horas con ácido hialurónico y vitamina E.",
        category: "cremas",
        stock: 12,
        featured: true,
        ingredients: ["Ácido hialurónico", "Vitamina E", "Manteca de karité", "Glicerina"]
    },
    // Aceites
    {
        id: 501,
        name: "Aceite de Rosa Mosqueta",
        price: 19.99,
        image: "https://images.unsplash.com/photo-1608571702346-bf078a741b19?w=400",
        description: "Aceite regenerador rico en vitaminas para cicatrices y manchas.",
        category: "aceites",
        stock: 16,
        featured: false,
        ingredients: ["Rosa mosqueta 100%", "Vitamina A", "Vitamina E", "Ácidos grasos esenciales"]
    },
    {
        id: 502,
        name: "Aceite de Argán",
        price: 24.99,
        image: "https://images.unsplash.com/photo-1647934174425-61136513aed7?w=400",
        description: "Aceite marroquí premium para cabello y piel radiante.",
        category: "aceites",
        stock: 14,
        featured: true,
        ingredients: ["Argán orgánico 100%", "Vitamina E", "Ácido oleico", "Ácido linoleico"]
    }
];