// /home/genichurro/Documentos/IA/static/js/chat.js
// ============================================
// herbIA - Asistente de Chat
// --- [MEJORA] ---
// - handleAIResult ahora reconoce la acción 'navigate_and_filter'.
// - Llama a una nueva función 'filterByCategory' en productManager
//   (que crearemos en products.js) para aplicar el filtro de categoría.

class HerbIAChat {
    constructor() {
        this.isOpen = false;
        this.messages = this.loadHistory();
        this.isTyping = false;
        this.aiEndpoint = CONFIG.API_URL + '/chat';
        this.init();
    }

    init() {
        console.log('🤖 Inicializando herbIA Chat...');
        try {
            this.elements = {
                toggle: document.getElementById('chatToggle'),
                window: document.getElementById('chatWindow'),
                close: document.getElementById('chatClose'),
                messages: document.getElementById('chatMessages'),
                input: document.getElementById('chatInput'),
                send: document.getElementById('chatSend')
            };
            // ... (validación de elementos sin cambios) ...
            const missingElements = Object.entries(this.elements).filter(([key, el]) => !el).map(([key]) => key);
            if (missingElements.length > 0) {
                 console.error('❌ Elementos faltantes:', missingElements);
                 return;
            }

            this.setupEventListeners();
            this.renderHistory();
            console.log('✅ herbIA Chat inicializado. Endpoint:', this.aiEndpoint);
        } catch (error) {
            console.error('❌ Error al inicializar herbIA:', error);
        }
    }
    
    setupEventListeners() {
        // ... (sin cambios) ...
        this.elements.toggle.addEventListener('click', () => this.toggleChat());
        this.elements.close.addEventListener('click', () => this.closeChat());
        this.elements.send.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    toggleChat() {
        // ... (sin cambios) ...
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.elements.window.classList.add('open');
            this.elements.input.focus();
        } else {
            this.elements.window.classList.remove('open');
        }
    }

    closeChat() {
        // ... (sin cambios) ...
        this.isOpen = false;
        this.elements.window.classList.remove('open');
    }
    
    loadHistory() {
        // ... (sin cambios - usa sessionStorage) ...
        const data = sessionStorage.getItem('herbia_chat_history');
        const history = data ? JSON.parse(data) : null;
        if (!history || history.length === 0) {
             const welcomeMessage = '¡Hola! Soy herb<span class="herbia-accent">IA</span>, tu asistente personal de Bo\'s Beauty. ¿En qué puedo ayudarte hoy?';
             return [{ text: welcomeMessage, sender: 'bot', timestamp: new Date().toISOString() }];
        }
        return history;
    }

    saveHistory() {
        // ... (sin cambios - usa sessionStorage) ...
        const recentMessages = this.messages.slice(-20);
        sessionStorage.setItem('herbia_chat_history', JSON.stringify(recentMessages));
    }
    
    renderHistory() {
        // ... (sin cambios) ...
        this.elements.messages.innerHTML = '';
        this.messages.forEach(msg => this.renderMessage(msg.text, msg.sender, new Date(msg.timestamp)));
        this.scrollToBottom();
    }
    
    async sendMessage() {
        // ... (sin cambios) ...
        const message = this.elements.input.value.trim();
        if (!message || this.isTyping) return;
        this.addUserMessage(message);
        this.elements.input.value = '';
        this.showTypingIndicator();
        try {
            const result = await this.getAIResponse(message);
            this.hideTypingIndicator();
            await this.handleAIResult(result);
        } catch (error) {
            this.hideTypingIndicator();
            const errorMsg = error.message.includes("JSON") ? "Respuesta inválida servidor." : error.message;
            this.addBotMessage(`Lo siento, ocurrió un error: ${errorMsg}`);
            console.error('Error getting AI response:', error);
        }
    }

    addUserMessage(text) {
        // ... (sin cambios) ...
        const timestamp = new Date();
        this.messages.push({ text, sender: 'user', timestamp: timestamp.toISOString() });
        this.renderMessage(text, 'user', timestamp);
        this.saveHistory();
        this.scrollToBottom();
    }

    addBotMessage(html) {
        // ... (sin cambios) ...
        const timestamp = new Date();
        this.messages.push({ text: html, sender: 'bot', timestamp: timestamp.toISOString() });
        this.renderMessage(html, 'bot', timestamp);
        this.saveHistory();
        this.scrollToBottom();
    }
    
    renderMessage(content, sender, timestamp) {
        // ... (sin cambios) ...
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${sender}`;
        const timeStr = this.formatTime(timestamp);
        const botIcon = getIcon('package', 'message-icon');
        if (sender === 'bot') {
            messageEl.innerHTML = `<div class="message-avatar">${botIcon}</div><div class="message-content"><p>${content}</p><span class="message-time">${timeStr}</span></div>`;
        } else {
            messageEl.innerHTML = `<div class="message-content"><p>${escapeHtml(content)}</p><span class="message-time">${timeStr}</span></div>`;
        }
        this.elements.messages.appendChild(messageEl);
    }
    
    showTypingIndicator() {
        // ... (sin cambios) ...
        this.isTyping = true;
        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator';
        const botIcon = getIcon('package', 'message-icon');
        typingEl.innerHTML = `<div class="message-avatar">${botIcon}</div><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
        this.elements.messages.appendChild(typingEl);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        // ... (sin cambios) ...
        this.isTyping = false;
        const indicator = this.elements.messages.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    formatTime(date) {
        // ... (sin cambios) ...
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Ahora';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        // ... (sin cambios) ...
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    async getAIResponse(userMessage) {
        // ... (sin cambios) ...
        const response = await fetch(this.aiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userMessage, history: this.messages })
        });
        if (!response.ok) {
            try {
                const errData = await response.json();
                throw new Error(errData.response || errData.message || `Error HTTP: ${response.status}`);
            } catch (e) { throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`); }
        }
        const data = await response.json();
        if (!data.success) { throw new Error(data.response || 'Error API chat.'); }
        return data;
    }

    // --- [MODIFICADO] ---
    async handleAIResult(result) {
        // 1. Muestra SIEMPRE la respuesta de texto
        this.addBotMessage(result.response); 
        
        const action = result.action;
        
        // 2. Ejecuta acciones del lado del cliente
        if (action === "navigate") {
            scrollToElement(result.target);
            showToast(`Listo, te llevé a la sección ${result.target.substring(1).replace('-', ' ')}`, 'success');
        
        // --- [NUEVO] Manejar la acción de filtrar ---
        } else if (action === "navigate_and_filter") {
            // Primero, navega a la sección de productos
            scrollToElement(result.target); // result.target será "#productos"
            
            // Luego, llama a la nueva función en productManager para aplicar el filtro
            if (typeof productManager !== 'undefined' && productManager.filterByCategory) {
                // Le pasamos la categoría que vino del backend (ej: "jabones")
                productManager.filterByCategory(result.category); 
                showToast(`Listo, mostrando los ${result.category}.`, 'success');
            } else {
                showToast('Error: No se pudo aplicar el filtro de categoría (products.js).', 'error');
                console.error("Error: productManager o productManager.filterByCategory no están definidos.");
            }
        // ---------------------------------------------

        } else if (action === "cart_show") {
            // ... (sin cambios) ...
            if (typeof cart !== 'undefined' && cart.openCart) { cart.openCart(); }
            else { showToast('Error: Carrito no disponible (cart.js).', 'error'); }
        
        } else if (action === "cart_clear") {
            // ... (sin cambios) ...
             if (typeof cart !== 'undefined' && cart.clearCart) {
                if (confirmAction("¿Vaciar el carrito?")) { cart.clearCart(); showToast('Carrito vaciado.', 'success'); }
            } else { showToast('Error: Carrito no disponible (cart.js).', 'error'); }
        
        } else if (action === "cart_add") {
            // ... (sin cambios) ...
            const productName = result.product_name?.toLowerCase();
            if (typeof productManager !== 'undefined' && productManager.products) {
                 const product = productManager.products.find(p => p.name?.toLowerCase().includes(productName));
                 if (product) { productManager.handleAddToCart(product.id); }
                 else { this.addBotMessage(`No encontré "${result.product_name}". ¿Más específico?`); }
            } else { showToast('Error: Productos no disponibles (products.js).', 'error'); }
        }
        // No se necesita 'else if (action === "info")'
    }
}

// Inicialización Global
let herbIAChat;
document.addEventListener('DOMContentLoaded', () => {
    herbIAChat = new HerbIAChat();
});