// /home/genichurro/Documentos/v2/IA/static/js/products.js
// Gestión de Productos
// --- [MEJORA] ---
// - Se añadió la función 'filterByCategory' para ser llamada externamente (por chat.js).
// - Esta función simula un clic en el tab de categoría correspondiente.

console.log("-> products.js cargado.");

class ProductManager {
    constructor() {
        this.products = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.sortBy = 'name-asc';
        this.minPrice = 0;
        // [IMPORTANTE] Asegúrate que este maxPrice coincida con el 'max' del slider HTML
        this.maxPrice = 500; // Lo ajusté a 500 basado en tu HTML
        this.init();
    }

    async init() {
        console.log("ProductManager: Iniciando...");
        await this.loadProducts();
        this.setupCategoryTabs();
        this.setupFilters();
        this.renderProducts(); // Render inicial
        console.log("ProductManager: Inicialización completa.");
    }

    async loadProducts() {
        // ... (sin cambios) ...
        const loadingEl = document.querySelector('.products-grid .loading');
        if (loadingEl) console.log("ProductManager: Mostrando spinner.");
        try {
            const data = await apiRequest('products');
            this.products = data.products || [];
            console.log(`ProductManager: ✅ Productos cargados: ${this.products.length}`);
            if (this.products.length > 0) console.log("ProductManager: Ejemplo:", this.products[0]);
        } catch (error) {
            console.error('ProductManager: ❌ Error cargando productos:', error.message);
            console.warn("ProductManager: Usando productos de respaldo.");
            this.products = typeof DEFAULT_PRODUCTS !== 'undefined' ? DEFAULT_PRODUCTS : [];
            showToast('Error de conexión. Mostrando productos ejemplo.', 'error');
        } finally {
            if (loadingEl) { loadingEl.remove(); console.log("ProductManager: Spinner ocultado."); }
        }
    }

    setupCategoryTabs() {
        // ... (sin cambios) ...
        const tabButtons = document.querySelectorAll('.tab-button');
        if (!tabButtons || tabButtons.length === 0) {
            console.warn("ProductManager: No se encontraron botones de categoría.");
            return;
        }
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleCategoryClick(button); // Llama a una función separada
            });
        });
        console.log("ProductManager: Tabs de categoría configurados.");
    }

    // --- [NUEVO] Función separada para manejar clic/selección de categoría ---
    handleCategoryClick(buttonElement) {
        if (!buttonElement) return;

        const category = buttonElement.dataset.category;
        console.log(`ProductManager: Categoría seleccionada: ${category}`);

        // Actualizar UI de los botones
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');

        // Actualizar estado interno y renderizar
        this.currentCategory = category;
        this.renderProducts();
    }
    // -------------------------------------------------------------------

    setupFilters() {
        // ... (sin cambios en la lógica de búsqueda y ordenamiento) ...
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderProducts();
            }, 300));
        } else { console.warn("Input búsqueda no encontrado."); }

        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderProducts();
            });
        } else { console.warn("Select orden no encontrado."); }

        // --- Filtro de precio (Ajustado max a 500) ---
        const minSlider = document.getElementById('minPriceSlider');
        const maxSlider = document.getElementById('maxPriceSlider');
        const minInput = document.getElementById('minPriceInput');
        const maxInput = document.getElementById('maxPriceInput');
        const priceLabel = document.getElementById('priceRangeLabel');
        const MAX_PRICE_VALUE = 500; // Coincide con el HTML

        const updatePriceRange = () => {
            let min = parseInt(minSlider.value);
            let max = parseInt(maxSlider.value);
            if (min > max) [min, max] = [max, min];
            this.minPrice = min;
            this.maxPrice = max;
            if (document.activeElement !== minInput) minInput.value = min;
            if (document.activeElement !== maxInput) maxInput.value = max;
            if (priceLabel) priceLabel.textContent = `$${min} - $${max}`;
        };

        const debouncedRender = debounce(() => {
            console.log(`ProductManager: Aplicando filtro precio: ${this.minPrice}-${this.maxPrice}`);
            this.renderProducts();
        }, 300);

        if (minSlider && maxSlider && minInput && maxInput && priceLabel) {
            // Asegurarse de que los sliders tengan el max correcto
            minSlider.max = MAX_PRICE_VALUE;
            maxSlider.max = MAX_PRICE_VALUE;
            minInput.max = MAX_PRICE_VALUE;
            maxInput.max = MAX_PRICE_VALUE;
            maxSlider.value = MAX_PRICE_VALUE; // Establecer valor inicial
            maxInput.value = MAX_PRICE_VALUE; // Establecer valor inicial
            updatePriceRange(); // Actualizar etiqueta inicial

            minSlider.addEventListener('input', () => { updatePriceRange(); debouncedRender(); });
            maxSlider.addEventListener('input', () => { updatePriceRange(); debouncedRender(); });
            minInput.addEventListener('change', (e) => {
                const value = Math.max(0, Math.min(this.maxPrice, parseInt(e.target.value) || 0));
                minSlider.value = value; updatePriceRange(); debouncedRender();
            });
            maxInput.addEventListener('change', (e) => {
                const value = Math.max(this.minPrice, Math.min(MAX_PRICE_VALUE, parseInt(e.target.value) || 0));
                maxSlider.value = value; updatePriceRange(); debouncedRender();
            });
            console.log("ProductManager: Filtros precio configurados.");
        } else { console.warn("Faltan elementos filtro precio."); }
    }

    getFilteredProducts() {
        // ... (sin cambios en la lógica interna de filtrado) ...
        console.log("ProductManager: Filtrando productos...");
        let filtered = this.products;
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(product => product.category === this.currentCategory);
        }
        if (this.searchQuery) {
            filtered = filtered.filter(product =>
                (product.name?.toLowerCase().includes(this.searchQuery)) ||
                (product.description?.toLowerCase().includes(this.searchQuery)) ||
                (product.ingredients?.some(ing => ing?.toLowerCase().includes(this.searchQuery)))
            );
        }
        filtered = filtered.filter(product => {
            const price = parseFloat(product.price);
            return !isNaN(price) && price >= this.minPrice && price <= this.maxPrice;
        });
        filtered.sort((a, b) => {
            const priceA = parseFloat(a.price); const priceB = parseFloat(b.price);
            switch (this.sortBy) {
                case 'price-asc': return (isNaN(priceA)?Infinity:priceA) - (isNaN(priceB)?Infinity:priceB);
                case 'price-desc': return (isNaN(priceB)?-Infinity:priceB) - (isNaN(priceA)?-Infinity:priceA);
                case 'name-desc': return b.name.localeCompare(a.name);
                default: return a.name.localeCompare(b.name);
            }
        });
        console.log(`ProductManager: Filtrado completo. Resultantes: ${filtered.length}`);
        return filtered;
    }

    renderProducts() {
        // ... (sin cambios en la lógica de renderizado) ...
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) { console.error("Contenedor 'productsGrid' no encontrado."); return; }
        console.log("ProductManager: Renderizando productos...");
        const filteredProducts = this.getFilteredProducts();
        this.updateCategoryCounts();
        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = `<div class="loading" style="text-align:center;padding:2rem;grid-column:1/-1;"><p style="font-size:1.1em;font-weight:500;">No se encontraron productos.</p><p style="color:var(--text-light);margin-top:0.5rem;">Ajusta los filtros.</p></div>`;
            return;
        }
        console.log(`ProductManager: Mostrando ${filteredProducts.length} productos.`);
        productsGrid.innerHTML = filteredProducts.map(product => this.createProductCard(product)).join('');
    }

    updateCategoryCounts() {
        // ... (sin cambios) ...
        const categories = ['all', ...Object.keys(CONFIG.CATEGORIES)];
        const counts = {};
        this.products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
        counts['all'] = this.products.length;
        categories.forEach(category => {
            const countElement = document.getElementById(`count-${category}`);
            if (countElement) countElement.textContent = counts[category] || 0;
        });
    }

    createProductCard(product) {
        // ... (sin cambios) ...
        if (!product || !product.id || !product.name || !product.price || !product.image) { console.error("Producto inválido:", product); return ''; }
        const description = product.description || '';
        const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
        const stock = product.stock;
        return `
            <div class="product-card" data-id="${product.id}" data-category="${escapeHtml(product.category)}">
                <div class="product-image-wrapper"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="product-image" loading="lazy" onerror="this.src='https://via.placeholder.com/300?text=No+Imagen';"></div>
                <div class="product-info">
                    <h3 class="product-name">${escapeHtml(product.name)}</h3>
                    <p class="product-description">${escapeHtml(truncateText(description, 100))}</p>
                    ${ingredients.length > 0 ? `<div class="product-ingredients"><small><strong>Ingredientes:</strong> ${ingredients.slice(0, 3).map(i => escapeHtml(i)).join(', ')}${ingredients.length > 3 ? '...' : ''}</small></div>` : ''}
                    <div class="product-footer">
                        <span class="product-price">${formatPrice(product.price)}</span>
                        <button class="add-to-cart-button" onclick="productManager.handleAddToCart(${product.id})">Agregar</button>
                    </div>
                    ${(typeof stock==='number'&&stock<10&&stock>0)?`<div class="stock-warning"><svg ...><path.../><line.../><line.../></svg><span>¡Solo quedan ${stock}!</span></div>`: (typeof stock==='number'&&stock<=0)?`<div class="stock-warning" style="color:#9ca3af;"><span>Agotado</span></div>`:''}
                </div>
            </div>`;
    }

    handleAddToCart(productId) {
        // ... (sin cambios) ...
        console.log(`ProductManager: Agregar presionado ID: ${productId}`);
        const product = this.products.find(p => p.id === productId);
        if (product) {
            if (typeof cart !== 'undefined' && cart instanceof ShoppingCart) { cart.addItem(product); }
            else { console.error("Instancia 'cart' no encontrada."); showToast("Error al agregar.", "error"); }
        } else { console.error(`Producto ID ${productId} no encontrado.`); showToast("Error: Producto no hallado.", "error"); }
    }

    getProductById(id) {
        // ... (sin cambios) ...
        const numericId = parseInt(id);
        return this.products.find(p => p.id === numericId);
    }

    async refreshProducts() {
        // ... (sin cambios) ...
        console.log("ProductManager: Refrescando productos...");
        await this.loadProducts();
        this.renderProducts();
        console.log("ProductManager: Productos refrescados.");
    }

    // --- [NUEVA] Función para filtrar por categoría desde fuera ---
    filterByCategory(category) {
        console.log(`ProductManager: Filtro externo solicitado para categoría: ${category}`);
        // Busca el botón correspondiente a la categoría
        const buttonElement = document.querySelector(`.tab-button[data-category="${category}"]`);
        
        if (buttonElement) {
            // Llama a la misma función que maneja los clics manuales
            this.handleCategoryClick(buttonElement);
        } else {
            console.warn(`ProductManager: No se encontró botón para categoría: ${category}`);
            // Opcional: mostrar 'todos' como fallback si la categoría no existe
            // const allButton = document.querySelector('.tab-button[data-category="all"]');
            // if (allButton) this.handleCategoryClick(allButton);
        }
    }
    // ------------------------------------------------------------
}

// Inicialización Global
let productManager;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('productsGrid')) {
        console.log("ProductManager: 'productsGrid' detectado, inicializando...");
        if (typeof CONFIG !== 'undefined' && typeof apiRequest === 'function') {
            productManager = new ProductManager();
        } else { console.error("Faltan dependencias (CONFIG o apiRequest)."); }
    } else { console.log("ProductManager: No 'productsGrid', no inicializa."); }
});