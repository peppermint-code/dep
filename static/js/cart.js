// Gestión del Carrito de Compras

class ShoppingCart {
    constructor() {
        this.items = this.loadCart();
        this.init();
    }

    init() {
        // Event listeners
        const cartButton = document.getElementById('cartButton');
        const closeCart = document.getElementById('closeCart');
        const overlay = document.getElementById('overlay');
        const checkoutButton = document.getElementById('checkoutButton');

        if (cartButton) {
            cartButton.addEventListener('click', () => this.openCart());
        }

        if (closeCart) {
            closeCart.addEventListener('click', () => this.closeCart());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.closeCart());
        }

        if (checkoutButton) {
            checkoutButton.addEventListener('click', () => this.checkout());
        }

        this.updateCartUI();
    }

    loadCart() {
        return getFromStorage(CONFIG.STORAGE_KEYS.CART) || [];
    }

    saveCart() {
        saveToStorage(CONFIG.STORAGE_KEYS.CART, this.items);
        this.updateCartUI();
    }

    addItem(product) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                ...product,
                quantity: 1
            });
        }

        this.saveCart();
        showToast(`¡${product.name} agregado al carrito!`, 'success');
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
        showToast('Producto eliminado del carrito', 'success');
    }

    updateQuantity(productId, quantity) {
        if (quantity <= 0) {
            this.removeItem(productId);
            return;
        }

        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = quantity;
            this.saveCart();
        }
    }

    getTotal() {
        return this.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    clearCart() {
        this.items = [];
        this.saveCart();
    }

    openCart() {
        const cartSidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('overlay');
        
        if (cartSidebar) {
            cartSidebar.classList.add('open');
        }
        if (overlay) {
            overlay.classList.add('active');
        }
        
        this.renderCartItems();
    }

    closeCart() {
        const cartSidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('overlay');
        
        if (cartSidebar) {
            cartSidebar.classList.remove('open');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    renderCartItems() {
        const cartItemsContainer = document.getElementById('cartItems');
        
        if (!cartItemsContainer) return;

        if (this.items.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="8" cy="21" r="1"/>
                            <circle cx="19" cy="21" r="1"/>
                            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                        </svg>
                    </div>
                    <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Tu carrito está vacío</p>
                    <p style="font-size: 0.875rem; color: var(--text-light);">Agrega productos para continuar</p>
                </div>
            `;
            return;
        }

        cartItemsContainer.innerHTML = this.items.map(item => `
            <div class="cart-item">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-item-image" loading="lazy">
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                    <div class="cart-item-quantity">
                        <button class="qty-button" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})" aria-label="Disminuir cantidad">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                        <span>${item.quantity}</span>
                        <button class="qty-button" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})" aria-label="Aumentar cantidad">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                    </div>
                    <button class="remove-item" onclick="cart.removeItem(${item.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        <span>Eliminar</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateCartUI() {
        // Actualizar badge del carrito
        const cartBadge = document.getElementById('cartBadge');
        if (cartBadge) {
            const totalItems = this.getTotalItems();
            cartBadge.textContent = totalItems;
            cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
        }

        // Actualizar total
        const cartTotal = document.getElementById('cartTotal');
        if (cartTotal) {
            cartTotal.textContent = formatPrice(this.getTotal());
        }

        // Renderizar items si el carrito está abierto
        const cartSidebar = document.getElementById('cartSidebar');
        if (cartSidebar && cartSidebar.classList.contains('open')) {
            this.renderCartItems();
        }
    }

    checkout() {
        if (this.items.length === 0) {
            showToast('Tu carrito está vacío', 'error');
            return;
        }

        // Aquí se implementaría la integración con un sistema de pagos
        // Por ahora, solo mostramos un mensaje de confirmación
        const total = this.getTotal();
        const itemCount = this.getTotalItems();
        
        if (confirmAction(`¿Proceder al pago de ${formatPrice(total)} por ${itemCount} producto(s)?`)) {
            showToast('¡Gracias por tu compra! (Demo - No se procesó el pago)', 'success');
            this.clearCart();
            this.closeCart();
        }
    }
}

// Inicializar carrito global
let cart;
document.addEventListener('DOMContentLoaded', () => {
    cart = new ShoppingCart();
});
