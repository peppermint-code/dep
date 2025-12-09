# /home/genichurro/Documentos/v2/IA/app/routes.py
# --- RESPONSABILIDAD ---
# 1. Definir todas las rutas (endpoints) de la aplicación Flask.
# 2. Conectar las rutas a sus respectivas funciones de lógica (handlers).
# 3. Manejar el renderizado de los templates HTML.
# --- [MEJORA] ---
# - Se añadieron las rutas /api/login, /api/logout, /api/check_auth
#   para manejar la autenticación del panel de administración usando sesiones Flask.

# --- [MODIFICADO] ---
# Importar 'session' y 'jsonify' de Flask
from flask import current_app, render_template, request, session, jsonify

# Importar la configuración para acceder a las credenciales demo
from app.config import Config

# Importar los "handlers" (manejadores de lógica)
from app import ai_logica 
from app import db_logic

# ======================================================
# 1. RUTAS DEL FRONTEND (PÁGINAS HTML)
# ======================================================

@current_app.route('/')
def serve_index():
    """Sirve el archivo principal index.html."""
    return render_template('index.html')

@current_app.route('/admin.html')
def serve_admin():
    """Sirve el panel de administración admin.html."""
    return render_template('admin.html')

# ======================================================
# 2. RUTAS DE AUTENTICACIÓN (LOGIN/LOGOUT ADMIN)
# ======================================================

@current_app.route('/api/login', methods=['POST'])
def admin_login():
    """Maneja el intento de login del administrador."""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    # Validación simple usando las credenciales demo de config.py
    if email == Config.DEMO_EMAIL and password == Config.DEMO_PASSWORD:
        # Crear la sesión Flask
        session['admin_logged_in'] = True
        session['admin_email'] = email
        print(f"✅ Login exitoso para: {email}")
        return jsonify({'success': True, 'message': 'Login exitoso'})
    else:
        print(f"❌ Login fallido para: {email}")
        # Devuelve un error 401 Unauthorized
        return jsonify({'success': False, 'message': 'Credenciales incorrectas'}), 401

@current_app.route('/api/logout', methods=['POST'])
def admin_logout():
    """Cierra la sesión del administrador."""
    # Limpiar la sesión Flask
    session.pop('admin_logged_in', None)
    session.pop('admin_email', None)
    print("🔒 Sesión de admin cerrada.")
    return jsonify({'success': True, 'message': 'Sesión cerrada'})

@current_app.route('/api/check_auth', methods=['GET'])
def check_auth():
    """Verifica si el usuario actual tiene una sesión de admin activa."""
    if session.get('admin_logged_in'):
        return jsonify({'authenticated': True, 'email': session.get('admin_email')})
    else:
        return jsonify({'authenticated': False})

# ======================================================
# 3. RUTAS DE LA API (DATOS JSON - PRODUCTOS Y CHAT)
# ======================================================

@current_app.route('/api/products', methods=['GET', 'POST'])
def products_handler():
    """
    Ruta unificada para la API de productos.
    Delega el trabajo a los handlers de 'db_logic'.
    """
    if request.method == 'GET':
        return db_logic.handle_products_get()
    
    elif request.method == 'POST':
        # Requiere autenticación para modificar productos (POST)
        if not session.get('admin_logged_in'):
             return jsonify({'success': False, 'message': 'No autorizado'}), 401
        return db_logic.handle_products_post(request)

@current_app.route('/api/chat', methods=['POST'])
def chat_handler():
    """
    Ruta para la API del chatbot.
    Delega todo el trabajo al handler de 'ai_logica'.
    """
    return ai_logica.handle_chat_request(request)