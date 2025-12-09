# /home/genichurro/Documentos/v2/IA/app/__init__.py
# --- RESPONSABILIDAD ---
# ...
# --- [MEJORA] ---
# - Se adjunta el estado de Gemini a 'app.gemini_is_ready'.
# - [NUEVO] Se establece explícitamente 'app.secret_key' para asegurar
#   que las sesiones Flask funcionen correctamente.

import os
import google.generativeai as genai
from flask import Flask
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

from app.config import Config

def create_app():
    """
    Fábrica de Aplicaciones: Crea y configura la instancia de la app Flask.
    """
    
    app = Flask(__name__, 
                static_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'static')),
                template_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates')))

    # 2. Cargar Configuración
    app.config.from_object(Config)

    # --- [NUEVO] Establecer explícitamente la Secret Key ---
    # Aunque from_object debería hacerlo, esto asegura que esté definida.
    # Si FLASK_SECRET_KEY no está en config (validación falló antes), esto dará error aquí.
    if 'FLASK_SECRET_KEY' in app.config and app.config['FLASK_SECRET_KEY']:
        app.secret_key = app.config['FLASK_SECRET_KEY']
    else:
        # Esto no debería pasar si la validación en config.py funciona, pero es una salvaguarda.
        raise ValueError("FLASK_SECRET_KEY no está configurada o es inválida.")
    # --------------------------------------------------------

    # 3. Configurar Extensiones
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # 4. Asegurar que exista la carpeta de UPLOADS
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except OSError as e:
        print(f"Error al crear la carpeta UPLOAD_FOLDER: {e}")

    # 5. Inicializar Clientes de Servicios (IA)
    app.gemini_is_ready = False 
    try:
        if app.config['GEMINI_API_KEY']:
            genai.configure(api_key=app.config['GEMINI_API_KEY'])
            next(genai.list_models()) 
            print("✅ Cliente Gemini (v0.8+) inicializado y autenticado.")
            app.gemini_is_ready = True
        else:
            print("⚠️ Cliente Gemini NO inicializado (GEMINI_API_KEY no encontrada).")
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: FALLO AL INICIALIZAR EL CLIENTE GEMINI: {e}")
        app.gemini_is_ready = False

    # 6. Registrar Rutas
    with app.app_context():
        from . import routes
        print("✅ Rutas (routes.py) conectadas a la aplicación.")

    # 7. Devolver la aplicación configurada
    return app