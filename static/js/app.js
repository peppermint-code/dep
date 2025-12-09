// Aplicación Principal - Bo's Beauty

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌿 Bo\'s Beauty - Aplicación iniciada');
    
    // Inicializar formulario de contacto
    initContactForm();
    
    // Smooth scroll para navegación
    initSmoothScroll();
});

// Formulario de contacto
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            };
            
            // Validación
            const errors = validateForm(formData, {
                name: { required: true, label: 'Nombre' },
                email: { required: true, type: 'email', label: 'Email' },
                message: { required: true, label: 'Mensaje', min: 10 }
            });
            
            if (errors.length > 0) {
                showToast(errors[0], 'error');
                return;
            }
            
            try {
                // Aquí se enviaría el formulario a la API
                // Por ahora simulamos el envío
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                showToast('¡Mensaje enviado exitosamente! Te contactaremos pronto.', 'success');
                contactForm.reset();
            } catch (error) {
                showToast('Error al enviar el mensaje. Intenta de nuevo.', 'error');
            }
        });
    }
}

// Smooth scroll para navegación
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            scrollToElement(targetId);
        });
    });
}

// Función para refrescar productos (puede ser llamada desde el admin)
window.refreshProducts = async function() {
    if (productManager) {
        await productManager.refreshProducts();
        showToast('Productos actualizados', 'success');
    }
};
