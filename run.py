# /home/genichurro/Documentos/v2/IA/run.py
# --- RESPONSABILIDAD ---
# 1. Este es el PUNTO DE ENTRADA de tu aplicación.
# 2. Importa la "fábrica" (create_app) desde el paquete 'app'.
# 3. Crea la instancia de la aplicación.
# 4. Inicia el servidor Flask.
# --- [MEJORA] ---
# - Se eliminó la importación de la variable global 'gemini_client_initialized'.
# - Ahora lee 'app.gemini_is_ready' DESPUÉS de crear la app,
#   mostrando el estado de Gemini correcto en el log.

# --- [MODIFICADO] ---
# Solo importamos la fábrica y la configuración
from app import create_app
from app.config import Config

# 1. Llama a la fábrica para construir la aplicación
# La variable 'app' ahora contiene 'app.gemini_is_ready'
app = create_app()

if __name__ == '__main__':
    # Esta sección se ejecuta solo cuando corres 'python run.py'
    
    print("\n----------------------------------------------------")
    print("✅ SERVIDOR FLASK MODULAR (CON ENRUTADOR IA) LISTO")
    print("----------------------------------------------------")
    
    # --- [MODIFICADO] ---
    # Lee el estado 'gemini_is_ready' desde el objeto 'app'
    if app.gemini_is_ready:
        print("☁️  Modo Cloud (Gemini):         Habilitado")
    else:
        print("☁️  Modo Cloud (Gemini):         DESHABILITADO (Verifica API Key)")
    
    print(f"🏠 Modo Local (FAQ):            Habilitado (Intentará conectar a: {Config.LOCAL_LLM_URL})")
    print("----------------------------------------------------")
    print(f"URL de Acceso: http://127.0.0.1:5000/")
    print("----------------------------------------------------")
    
    # Inicia el servidor
    app.run(debug=True, port=5000, host='0.0.0.0')