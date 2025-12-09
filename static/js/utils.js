// /home/genichurro/Documentos/IA/static/js/utils.js
// Utilidades generales
//
// --- AUDITORÍA ---
// Este archivo es 100% compatible con la nueva arquitectura de backend.
// La función `apiRequest` ya usa `CONFIG.API_URL` para construir
// las rutas (ej. '/api/products'), lo cual es correcto.
// No se requieren cambios.

// Sistema de notificaciones Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconSVG = type === 'success'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    
    toast.innerHTML = `
        <div class="toast-icon">${iconSVG}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Hacer petición a la API (CORREGIDO)
async function apiRequest(endpoint, options = {}) {
    try {
        let url;
        // CORRECCIÓN CLAVE: Eliminar .php y usar CONFIG.API_URL
        if (endpoint.startsWith('http')) {
            url = endpoint;
        } else {
             // Construye: /api/products
             url = `${CONFIG.API_URL}/${endpoint}`;
        }
        
        const defaultOptions = {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const token = getFromStorage(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body instanceof FormData) {
            delete defaultOptions.headers['Content-Type'];
        }

        const response = await fetch(url, { ...defaultOptions, ...options });
        if (!response.ok) {
             const errorText = await response.text();
             console.error("Error HTTP - Respuesta del servidor:", errorText);
             // Intenta parsear el JSON de error del backend
             try {
                const errData = JSON.parse(errorText);
                throw new Error(errData.message || `Error HTTP: ${response.status}`);
             } catch(e) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
             }
        }

        const data = await response.json();
        if (!data.success) {
            console.error("Error API:", data.message);
            throw new Error(data.message || 'La API devolvió un error no especificado');
        }

        return data;
    } catch (error) {
        console.error('Error en la petición a la API:', error);
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
             throw new Error("Error: La respuesta del servidor no es un JSON válido.");
        }
        throw error;
    }
}


// Formatear precio
function formatPrice(price) {
    if (typeof price !== 'number') {
        price = parseFloat(price);
    }
    return !isNaN(price) ? `$${price.toFixed(2)}` : '$0.00';
}


// Guardar en localStorage
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

// Obtener de localStorage
function getFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}

// Eliminar de localStorage
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

// Validar email
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validar formulario (simple)
function validateForm(formData, rules) {
    const errors = [];
    for (const [field, rule] of Object.entries(rules)) {
        const value = formData[field];
        if (rule.required && !value) {
            errors.push(`${rule.label} es requerido`);
            continue;
        }
        if (rule.type === 'email' && value && !isValidEmail(value)) {
            errors.push(`${rule.label} no es válido`);
        }
    }
    return errors;
}


// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Generar ID único (útil para el frontend si es necesario)
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}


// Escape HTML para prevenir XSS
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}


// Cargar imagen con preview
function loadImagePreview(input, previewElement) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block'; 
        };
         reader.onerror = function(e) {
             console.error("Error al leer el archivo:", e);
             previewElement.style.display = 'none'; 
         };
        reader.readAsDataURL(file);
    } else {
         previewElement.style.display = 'none';
         previewElement.src = ''; 
    }
}


// Confirmar acción
function confirmAction(message) {
    return window.confirm(message);
}

// Smooth scroll a elemento
function scrollToElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        console.warn(`Elemento no encontrado para scroll: ${selector}`);
    }
}


// Copiar al portapapeles
async function copyToClipboard(text) {
    if (!navigator.clipboard) {
      showToast('Tu navegador no soporta copiar al portapapeles.', 'error');
      return false;
    }
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles', 'success');
        return true;
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showToast('Error al copiar', 'error');
        return false;
    }
}

// Descargar como archivo
function downloadAsFile(content, filename, type = 'text/plain;charset=utf-8') {
    try {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch(e) {
        console.error("Error al descargar archivo:", e);
        showToast("No se pudo generar la descarga.", "error");
    }
}

// Formatear fecha
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return "Fecha inválida";
        }
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        });
    } catch (e) {
        console.error("Error formateando fecha:", dateString, e);
        return "Fecha inválida";
    }
}

// Truncar texto
function truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trimEnd() + '...';
}