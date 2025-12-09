// /home/genichurro/Documentos/v2/IA/static/js/admin.js
// Panel Administrativo - Bo's Beauty
// --- [MEJORA] ---
// - handleLogin ahora llama al endpoint /api/login del backend
//   para verificar las credenciales y establecer una sesión Flask segura.
// - handleLogout ahora llama al endpoint /api/logout.
// - checkAuthentication ahora verifica la sesión del backend en lugar de localStorage.

// ... (convertGoogleDriveUrl function remains the same) ...
function convertGoogleDriveUrl(url) {
    const regExp = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
}


class AdminPanel {
    constructor() {
        this.products = [];
        this.deleteProductId = null;
        this.editProductId = null;
        this.isAuthenticated = false; // Estado inicial
        this.init();
    }

    async init() {
        // [MODIFICADO] Verificar autenticación con el backend al iniciar
        await this.checkAuthentication();
        this.setupEventListeners();
        if (this.isAuthenticated) {
            this.loadProducts(); // Cargar productos solo si está autenticado
        }
    }

    // --- [MODIFICADO] Verifica la sesión con el backend ---
    async checkAuthentication() {
        try {
            // Llama a un nuevo endpoint que verifica la sesión del lado del servidor
            const data = await apiRequest('check_auth'); // Usa GET por defecto
            if (data.authenticated) {
                this.isAuthenticated = true;
                this.showAdminPanel(data.email);
            } else {
                this.isAuthenticated = false;
                this.showLoginScreen();
            }
        } catch (error) {
            console.error("Error checking auth:", error);
            this.isAuthenticated = false;
            this.showLoginScreen();
            // No mostrar toast aquí, podría ser molesto al cargar la página
        }
    }

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const adminPanel = document.getElementById('adminPanel');
        if (loginScreen) loginScreen.style.display = 'flex';
        if (adminPanel) adminPanel.style.display = 'none';
    }

    showAdminPanel(email) {
        const loginScreen = document.getElementById('loginScreen');
        const adminPanel = document.getElementById('adminPanel');
        const adminUser = document.getElementById('adminUser');
        if (loginScreen) loginScreen.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'block';
        if (adminUser) adminUser.textContent = email || 'Admin'; // Muestra 'Admin' si el email no viene
    }

    setupEventListeners() {
        // Eventos de Login/Logout
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutButton')?.addEventListener('click', () => this.handleLogout());

        // ... (el resto de los event listeners no cambian) ...
        document.getElementById('addProductButton')?.addEventListener('click', () => this.openAddProductModal());
        document.getElementById('importProductsButton')?.addEventListener('click', () => this.importProducts());
        document.getElementById('refreshButton')?.addEventListener('click', () => this.loadProducts());
        document.getElementById('productForm')?.addEventListener('submit', (e) => this.handleProductSubmit(e));
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeProductModal());
        document.getElementById('cancelButton')?.addEventListener('click', () => this.closeProductModal());
        document.getElementById('closeDeleteModal')?.addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelDelete')?.addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.confirmDeleteProduct());
        const productImageInput = document.getElementById('productImage');
        const productImageUrlInput = document.getElementById('productImageUrl');
        const previewImg = document.getElementById('previewImg');
        if (productImageInput && previewImg) {
            productImageInput.addEventListener('change', (e) => {
                loadImagePreview(e.target, previewImg);
                productImageUrlInput.value = '';
            });
        }
        if (productImageUrlInput && previewImg) {
            productImageUrlInput.addEventListener('change', (e) => {
                const originalUrl = e.target.value;
                if (originalUrl) {
                    const convertedUrl = convertGoogleDriveUrl(originalUrl);
                    e.target.value = convertedUrl;
                    previewImg.src = convertedUrl;
                    previewImg.style.display = 'block';
                    productImageInput.value = '';
                }
            });
        }
    }

    // --- [MODIFICADO] Llama al endpoint de login del backend ---
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        try {
            // Llama a la API de login en el backend
            const result = await apiRequest('login', {
                method: 'POST',
                body: JSON.stringify({ email: email, password: password })
            });

            // Si el login fue exitoso (el backend lo confirma y establece la cookie de sesión)
            this.isAuthenticated = true;
            this.showAdminPanel(email); // Muestra el panel
            await this.loadProducts();   // Carga los productos
            showToast('¡Bienvenido al panel administrativo!', 'success');

        } catch (error) {
            // Si apiRequest lanza un error (ej. 401 Unauthorized), muestra el mensaje de error
            showToast(error.message || 'Credenciales incorrectas', 'error');
            this.isAuthenticated = false;
            this.showLoginScreen();
        }
    }

    // --- [MODIFICADO] Llama al endpoint de logout del backend ---
    async handleLogout() {
        if (confirmAction('¿Estás seguro de que deseas cerrar sesión?')) {
            try {
                // Llama a la API de logout en el backend para limpiar la sesión
                await apiRequest('logout', { method: 'POST' });

                this.isAuthenticated = false;
                this.showLoginScreen(); // Oculta el panel admin
                showToast('Sesión cerrada', 'success');
                // No es necesario borrar localStorage aquí, la sesión del backend es lo importante
            } catch (error) {
                showToast(`Error al cerrar sesión: ${error.message}`, 'error');
            }
        }
    }

    // ... (El resto de las funciones: loadProducts, renderProductsTable, updateStats,
    //      openAddProductModal, openEditProductModal, closeProductModal, handleProductSubmit,
    //      openDeleteModal, closeDeleteModal, confirmDeleteProduct, importProducts
    //      permanecen SIN CAMBIOS respecto a la versión anterior que te di) ...

    async loadProducts() {
        try {
            const data = await apiRequest('products');
            this.products = data.products || [];
            if (this.products.length > 0) {
                console.log(`Se cargaron ${this.products.length} productos desde la base de datos.`);
            }
        } catch (error) {
            showToast('Error al cargar productos. Revisa la conexión con la API.', 'error');
            this.products = [];
        }
        this.renderProductsTable();
        this.updateStats();
    }

    renderProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;
        
        if (this.products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No hay productos.
            Haz clic en "Importar Productos" para empezar.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="product-table-image"></td>
                <td>${escapeHtml(product.name)}</td>
                <td><span class="category-badge">${escapeHtml(CONFIG.CATEGORIES[product.category] || product.category)}</span></td>
                <td>${formatPrice(product.price)}</td>
                <td class="${product.stock < 10 ? 'stock-low' : 'stock-ok'}">${product.stock || 'N/A'}</td>
                <td>${product.featured ? '<span class="featured-badge">★ Destacado</span>' : '-'}</td>
                <td>
                    <div class="table-actions">
                        <button class="edit-button" onclick="adminPanel.openEditProductModal(${product.id})">Editar</button>
                        <button class="delete-button-small" onclick="adminPanel.openDeleteModal(${product.id})">Eliminar</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateStats() {
        document.getElementById('totalProducts').textContent = this.products.length;
        document.getElementById('lowStock').textContent = this.products.filter(p => p.stock && p.stock < 10).length;
        document.getElementById('featuredCount').textContent = this.products.filter(p => p.featured).length;
    }

    openAddProductModal() {
        this.editProductId = null;
        document.getElementById('modalTitle').textContent = 'Agregar Producto';
        document.getElementById('productForm').reset();
        const previewImg = document.getElementById('previewImg');
        previewImg.style.display = 'none';
        previewImg.src = '';
        document.getElementById('productModal').classList.add('open');
    }

    openEditProductModal(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) {
            showToast('Error: No se encontró el producto.', 'error');
            return;
        }
        this.editProductId = id;
        document.getElementById('modalTitle').textContent = 'Editar Producto';
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productFeatured').checked = product.featured;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productIngredients').value = product.ingredients ? product.ingredients.join(', ') : '';
        document.getElementById('productImageUrl').value = product.image;
        const previewImg = document.getElementById('previewImg');
        previewImg.src = product.image;
        previewImg.style.display = 'block';
        document.getElementById('productImage').value = '';
        document.getElementById('productModal').classList.add('open');
    }
    
    closeProductModal() {
        document.getElementById('productModal').classList.remove('open');
        this.editProductId = null;
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        const isEditing = this.editProductId !== null;
        const formData = new FormData();
        formData.append('action', isEditing ? 'update' : 'create');
        if (isEditing) {
            formData.append('id', this.editProductId);
        }
        formData.append('name', document.getElementById('productName').value);
        formData.append('price', document.getElementById('productPrice').value);
        formData.append('category', document.getElementById('productCategory').value);
        formData.append('stock', document.getElementById('productStock').value);
        formData.append('featured', document.getElementById('productFeatured').checked);
        formData.append('description', document.getElementById('productDescription').value);
        const ingredients = document.getElementById('productIngredients').value.split(',').map(i => i.trim());
        formData.append('ingredients', JSON.stringify(ingredients));
        const imageUrl = document.getElementById('productImageUrl').value;
        formData.append('productImageUrl', imageUrl);
        const imageFile = document.getElementById('productImage').files[0];
        if (imageFile) {
            formData.append('productImageFile', imageFile);
        }
        if (!formData.get('name') || !formData.get('price') || !formData.get('category')) {
            showToast('Por favor completa todos los campos requeridos (*)', 'error');
            return;
        }
        try {
            const result = await apiRequest('products', {
                method: 'POST',
                body: formData,
            });
            showToast(result.message || 'Producto guardado exitosamente', 'success');
            await this.loadProducts();
            this.closeProductModal();
        } catch (error) {
            showToast(`Error al guardar: ${error.message}`, 'error');
        }
    }

    openDeleteModal(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;
        this.deleteProductId = id;
        document.getElementById('deleteProductName').textContent = product.name;
        document.getElementById('deleteModal').classList.add('open');
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('open');
        this.deleteProductId = null;
    }

    async confirmDeleteProduct() {
        if (!this.deleteProductId) return;
        try {
            await apiRequest('products', {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', id: this.deleteProductId })
            });
            showToast('Producto eliminado de la base de datos', 'success');
            await this.loadProducts();
            this.closeDeleteModal();
        } catch (error) {
            showToast(`Error al eliminar: ${error.message}`, 'error');
        }
    }

    async importProducts() {
        if (!confirmAction('¿Estás seguro? Esto agregará o actualizará los productos de ejemplo en la base de datos.')) {
            return;
        }
        try {
            const data = await apiRequest('products', {
                method: 'POST',
                body: JSON.stringify({ action: 'import', products: DEFAULT_PRODUCTS })
            });
            showToast(data.message, 'success');
            await this.loadProducts();
        } catch (error) {
            showToast(`Error al importar: ${error.message}`, 'error');
        }
    }
}

// Inicializar panel admin global
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializa si estamos en la página de admin
    if (document.body.classList.contains('admin-body')) {
        adminPanel = new AdminPanel();
    }
});