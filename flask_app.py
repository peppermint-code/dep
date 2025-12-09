# /home/genichurro/Documentos/IA/flask_app.py
# SERVIDOR UNIFICADO: Maneja el Frontend, Productos (Supabase) y Chat (Gemini)

import os
import json
import requests
from flask import Flask, request, jsonify, render_template, url_for, redirect, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from urllib.parse import urlencode
from dotenv import load_dotenv

# --- MODIFICACIÓN CLAVE: Importar ProxyFix ---
from werkzeug.middleware.proxy_fix import ProxyFix

# --- 1. CONFIGURACIÓN DE LLM Y SUPABASE ---
# Claves sensibles

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
SUPABASE_TABLE = os.getenv('SUPABASE_TABLE')

# --- CLAVE SECRETA GENERADA (IMPORTANTE PARA SESIONES Y NGROK) ---
# Generada con secrets.token_hex(32) 
# Esta es una clave de desarrollo. Se recomienda usar una variable de entorno en producción.
FLASK_SECRET_KEY = os.environ.get('FLASK_SECRET_KEY')

# --- 2. Dependencias LLM (Inicialización segura) ---
import requests 

# MODIFICACIÓN: Importar la nueva librería y las excepciones correctas
import google.generativeai as genai
from google.api_core import exceptions as api_exceptions 

# MODIFICACIÓN: Variable global para saber si Gemini está listo
gemini_is_initialized = False

try:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY no está configurada. Ejecuta 'export GEMINI_API_KEY=...' en tu terminal.")

    # MODIFICACIÓN: Nueva forma de configurar el cliente
    genai.configure(api_key=GEMINI_API_KEY)
    
    # MODIFICACIÓN: Hacemos una llamada de prueba para forzar la autenticación
    next(genai.list_models()) 
    print("✅ Cliente Gemini (v0.8+) inicializado y autenticado.")
    gemini_is_initialized = True

except Exception as e:
    print("----------------------------------------------------------------------")
    print(f"❌ ERROR CRÍTICO: FALLO AL INICIALIZAR EL CLIENTE GEMINI.")
    print(f"Error detallado: {e}")
    print("----------------------------------------------------------------------")
    gemini_is_initialized = False


# ======================================================
# INICIO DE MODIFICACIÓN: CONFIGURACIÓN DE FLASK
# ======================================================
app = Flask(__name__)
CORS(app) 
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')

# --- CONFIGURACIÓN CRÍTICA DE SESIÓN PARA NGROK/PROXY (HTTPS) ---
app.secret_key = FLASK_SECRET_KEY
app.config['SESSION_COOKIE_SECURE'] = True      # Obliga a usar cookies solo sobre HTTPS (necesario para Ngrok)
app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # Permite cookies en contexto cross-site (necesario para navegadores estrictos)
app.config['PREFERRED_URL_SCHEME'] = 'https'    # Indica que el esquema preferido es HTTPS
# ------------------------------------------------------------------
# ======================================================


# ======================================================
# 3. FUNCIONES DE AYUDA (SUPABASE Y CÓDIGO COMÚN)
# ======================================================

def fail(message, code=400):
    error_log = f"API Error [{code}]: {message}"
    print(error_log)
    return jsonify({'success': False, 'message': message}), code

def supabase_request(method, endpoint, body=None, use_service_key=False):
    global SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, SUPABASE_TABLE
    key = SUPABASE_SERVICE_KEY if use_service_key else SUPABASE_ANON_KEY
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}{endpoint}"
    headers = {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': f'Bearer {key}'
    }
    try:
        if body and method != 'GET':
            response = requests.request(method, url, headers=headers, json=body, timeout=15)
        else:
            response = requests.request(method, url, headers=headers, timeout=15)
        response.raise_for_status() 
        if response.status_code == 204: 
            return {'success': True, 'http_code': 204}
        return response.json()
    except requests.exceptions.HTTPError as errh:
        error_message = errh.response.json().get('message', str(errh))
        raise Exception(f"Supabase HTTP Error {errh.response.status_code}: {error_message}")
    except Exception as e:
        raise Exception(f"Error de conexión a Supabase: {e}")


# ======================================================
# 4. RUTAS PRINCIPALES DEL SITIO (Reemplaza a Apache)
# ======================================================

@app.route('/')
def serve_index():
    return render_template('index.html')

@app.route('/admin.html')
def serve_admin():
    return render_template('admin.html')


# ======================================================
# 5. RUTAS DE PRODUCTOS (Reemplaza products.php)
# ======================================================

@app.route('/api/products', methods=['GET', 'POST'])
def products_handler():
    # --- GET (SELECT de productos) ---
    if request.method == 'GET':
        try:
            endpoint = '?select=*&order=name.asc'
            products = supabase_request('GET', endpoint)
            processed_products = []
            for product in products:
                product['ingredients'] = product.get('ingredients', '').split(',') if product.get('ingredients') else []
                product['featured'] = bool(product.get('featured', False)) 
                processed_products.append(product)
            return jsonify({'success': True, 'products': processed_products})
        except Exception as e:
            print(f"Error GET products: {e}")
            return jsonify({'success': False, 'message': f"Error al cargar productos: {e}"}), 500

    # --- POST (CREATE, DELETE, IMPORT) ---
    elif request.method == 'POST':
        data = request.form.to_dict() if request.form else {}
        if not data and request.json:
            data = request.json
        action = data.get('action')

        try:
            if action == 'create':
                image_url = data.get('productImageUrl', '')
                if 'productImageFile' in request.files:
                    file = request.files['productImageFile']
                    if file.filename != '':
                        filename = secure_filename(file.filename)
                        unique_name = f"prod_{os.urandom(4).hex()}-{filename}"
                        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_name))
                        image_url = url_for('static', filename=f'uploads/{unique_name}', _external=True)
                if not image_url:
                     raise Exception("Debes proporcionar una imagen (subir archivo o URL).")
                ingredients_array = json.loads(data.get('ingredients', '[]'))
                payload = {
                    'name': data.get('name'),
                    'price': float(data.get('price', 0)),
                    'category': data.get('category'),
                    'stock': int(data.get('stock', 10)),
                    'featured': data.get('featured') == 'true',
                    'description': data.get('description'),
                    'ingredients': ','.join(ingredients_array),
                    'image': image_url
                }
                endpoint = '?select=id'
                result = supabase_request('POST', endpoint, [payload], True)
                return jsonify({'success': True, 'message': 'Producto creado exitosamente.', 'new_id': result[0]['id']})
            
            elif action == 'delete':
                product_id = data.get('id')
                if not product_id:
                    raise Exception("Falta ID para eliminar.")
                endpoint = f"?id=eq.{product_id}"
                supabase_request('DELETE', endpoint, None, True)
                return jsonify({'success': True, 'message': 'Producto eliminado.'})
            
            elif action == 'import':
                products_to_import = data.get('products', [])
                if not products_to_import:
                    raise Exception("No se encontraron productos para importar.")
                payloads = []
                for product in products_to_import:
                    payloads.append({
                        'name': product['name'],
                        'price': float(product['price']),
                        'category': product['category'],
                        'stock': int(product.get('stock', 10)),
                        'featured': bool(product.get('featured', False)),
                        'description': product['description'],
                        'ingredients': ','.join(product.get('ingredients', [])),
                        'image': product['image']
                    })
                supabase_request('POST', '', payloads, True)
                return jsonify({'success': True, 'message': f"{len(payloads)} productos importados", 'count': len(payloads)})
            
            else:
                return jsonify({'success': False, 'message': f"Acción '{action}' no reconocida."}), 400
        except Exception as e:
            print(f"Error POST products: {e}")
            return jsonify({'success': False, 'message': f"Error al procesar la acción: {e}"}), 500


# ======================================================
# 6. RUTAS DE CHAT (Lógica de LLM)
# ======================================================

def navigate_to_section(section: str) -> str:
    valid_sections = ["inicio", "productos", "sobre-nosotros", "contacto"]
    target_id = section.lower().replace(' ', '-')
    if target_id in valid_sections:
        target = f"#{target_id}"
        return json.dumps({"action": "navigate", "target": target, "message": f"Navegando a la sección {section.title()}."})
    else:
        return json.dumps({"action": "error", "message": f"Sección desconocida. Las opciones son: Inicio, Productos, Sobre Nosotros y Contacto."})

def manipulate_cart(action: str, product_name: str = None) -> str:
    if action == "show":
        return json.dumps({"action": "cart_show", "message": "Abriendo el carrito de compras."})
    elif action == "clear":
        return json.dumps({"action": "cart_clear", "message": "Solicitando limpiar el carrito."})
    elif action == "add" and product_name:
        return json.dumps({"action": "cart_add", "product_name": product_name, "message": f"Solicitando añadir {product_name} al carrito."})
    else:
        return json.dumps({"action": "error", "message": f"Acción de carrito no válida: {action} o falta el producto."})


# Mapeo de funciones y su configuración para el LLM
tools = {"navigate_to_section": navigate_to_section, "manipulate_cart": manipulate_cart}
tool_config = [navigate_to_section, manipulate_cart]


@app.route('/api/chat', methods=['POST'])
def chat_handler():
    """Recibe la petición del chatbot y llama a Gemini."""
    
    if not gemini_is_initialized:
        return jsonify({"success": False, "response": "Lo siento, el asistente de IA no está configurado (API Key inválida o fallo de inicialización)."}), 500

    try:
        data = request.json
        prompt = data.get('prompt', '').strip()
        history_raw = data.get('history', [])
        
        system_prompt = ("Eres herbIA, el asistente virtual experto en productos naturales de Bo's Beauty. "
                         "Tu rol es recomendar productos y ejecutar ACCIONES de navegación y carrito usando las herramientas disponibles. "
                         "Sé conciso, amable y profesional.")

        # Obtener el historial de sesión (aunque en el frontend ya lo manejas, es una capa de seguridad)
        if 'chat_history' not in session:
            session['chat_history'] = []
            
        # Añadir mensajes del frontend al historial del modelo
        contents = []
        for msg in history_raw[-10:]:
            if 'text' in msg:
                contents.append({
                    "role": "user" if msg['sender'] == 'user' else "model",
                    "parts": [msg['text']]
                })
        
        # Añadir el prompt actual del usuario
        contents.append({"role": "user", "parts": [prompt]})
        
        # Llamar al modelo
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_prompt,
            tools=tool_config
        )

        response = model.generate_content(
            contents,
            generation_config=genai.GenerationConfig(temperature=0.3)
        )
        
        # Procesar respuesta
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            if part.function_call:
                tool_call = part.function_call
                function_name = tool_call.name
                function_args = dict(tool_call.args)
                
                if function_name in tools:
                    result_json_str = tools[function_name](**function_args)
                    result_data = json.loads(result_json_str)
                    
                    return jsonify({
                        "success": True, 
                        "action": result_data.get("action"),
                        "target": result_data.get("target"),
                        "product_name": result_data.get("product_name"),
                        "response": result_data.get("message")
                    })

        if response.text:
            return jsonify({"success": True, "response": response.text})
        else:
            print(f"🚨 ADVERTENCIA GEMINI: La respuesta no contiene texto. Razón: {response.prompt_feedback}")
            return jsonify({"success": True, "response": "No pude generar una respuesta. Intenta reformular."})

    except api_exceptions.PermissionDenied as e:
        error_message = f"🚨 ERROR FATAL GEMINI: Permiso denegado. Google está bloqueando la solicitud (probablemente desde ngrok). Revisa las restricciones de tu API Key. Detalles: {e}"
        print(error_message)
        return jsonify({"success": False, "response": "Error de autenticación con la API de IA. Revisa las restricciones de la API Key."}), 403
    
    except api_exceptions.GoogleAPIError as e:
        error_message = f"🚨 ERROR FATAL GEMINI: Error de la API de Google. Detalles: {e}"
        print(error_message)
        return jsonify({"success": False, "response": f"Error de la API de Google: {e}"}), 500
    
    except Exception as e:
        error_message = f"🚨 ERROR (NO-GEMINI): {e}"
        print(error_message)
        return jsonify({"success": False, "response": "Lo siento, ocurrió un error interno general en el servidor."}), 500

# ======================================================
# 7. INICIO DEL SERVIDOR FLASK
# ======================================================

if __name__ == '__main__':
    # Asegúrate de que la carpeta de uploads exista
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # --- MODIFICACIÓN CLAVE: Aplicar ProxyFix ---
    # Esto le dice a Flask que confíe en los encabezados de Ngrok (X-Forwarded-Proto)
    # permitiendo que SESSION_COOKIE_SECURE=True funcione correctamente sobre el túnel HTTPS.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
    
    print("\n----------------------------------------------------")
    print("✅ SERVIDOR FLASK CONSOLIDADO (TODO EN PYTHON) LISTO")
    print("----------------------------------------------------")
    print(f"URL de Acceso: http://127.0.0.1:5000/")
    print("----------------------------------------------------")
    app.run(debug=True, port=5000)