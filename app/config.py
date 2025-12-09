# /home/genichurro/Documentos/v2/IA/app/config.py
# --- RESPONSABILIDAD ---
# 1. Cargar las variables de entorno (claves) desde el archivo .env.
# 2. Validar que las claves críticas existan antes de iniciar la app.
# 3. Almacenar todas las configuraciones en una clase 'Config' para fácil acceso.
# --- [MEJORA] ---
# - Se añadieron las credenciales DEMO_EMAIL y DEMO_PASSWORD a la clase Config.

import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    """
    Clase de configuración de la aplicación. Carga variables de .env
    y establece valores predeterminados seguros.
    """
    
    # --- Clave Secreta de Flask (CRÍTICA) ---
    FLASK_SECRET_KEY = os.getenv('FLASK_SECRET_KEY')
    
    # --- Configuración de Supabase ---
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
    SUPABASE_TABLE = os.getenv('SUPABASE_TABLE', 'products')

    # --- Configuración de IA (Nube) ---
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    # --- Configuración de IA (Local) ---
    LOCAL_LLM_URL = os.getenv('LOCAL_LLM_URL', 'http://127.0.0.1:5001/generate')

    # --- Configuración de Archivos ---
    UPLOAD_FOLDER = os.path.join(basedir, 'static', 'uploads')

    # --- [NUEVO] Credenciales de Demo ---
    # Coinciden con las usadas en el config.js original
    DEMO_EMAIL = 'admin@bosbeauty.com'
    DEMO_PASSWORD = 'admin123'
    # ------------------------------------

    @staticmethod
    def validate_config():
        """Valida que las variables de entorno críticas estén cargadas."""
        if not Config.FLASK_SECRET_KEY:
            raise ValueError(
                "❌ ERROR CRÍTICO: FLASK_SECRET_KEY no está configurada en .env. "
                "Genere una con: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        
        if not (Config.SUPABASE_URL and Config.SUPABASE_ANON_KEY and Config.SUPABASE_SERVICE_KEY):
            raise ValueError(
                "❌ ERROR CRÍTICO: Faltan variables de entorno de Supabase (URL, ANON_KEY, SERVICE_KEY)."
            )
            
        if not Config.GEMINI_API_KEY:
            print(
                "⚠️ ADVERTENCIA: GEMINI_API_KEY no está configurada. "
                "El 'Modo Cloud' de la IA (Gemini) estará deshabilitado."
            )

        if not Config.SUPABASE_TABLE:
            print(
                "⚠️ ADVERTENCIA: SUPABASE_TABLE no está configurada. "
                f"Se usará el valor por defecto: '{Config.SUPABASE_TABLE}'"
            )
        
        print("✅ Configuración cargada y validada.")

# Ejecutar la validación una vez
try:
    Config.validate_config()
except ValueError as e:
    print(e) # Imprime el error de validación si ocurre
    import sys
    sys.exit(1) # Detiene la aplicación si la configuración es inválida