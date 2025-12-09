# /home/genichurro/Documentos/v2/IA/app/ai_logica.py
# --- RESPONSABILIDAD ---
# ...
# --- [MEJORA] ---
# 10. 'navigate_to_section' ahora devuelve la acción 'navigate_and_filter'
#     cuando se detecta una categoría, incluyendo el nombre de la categoría.
# 11. Se actualizó el system_prompt para reflejar este cambio.

import json
import requests
from flask import jsonify, current_app 
import google.generativeai as genai
from google.api_core import exceptions as api_exceptions

from app.config import Config
from app.db_logic import get_product_info, list_products_by_category

# ======================================================
# 1. FUNCIONES HELPER (JSON)
# ======================================================

def fail(message, code=400):
    error_log = f"API Error [{code}]: {message}"
    print(error_log)
    return jsonify({'success': False, 'message': message}), code

# ======================================================
# 2. DEFINICIÓN DE HERRAMIENTAS DE IA (NO-DB)
# ======================================================

# --- [MODIFICADO] ---
def navigate_to_section(section: str) -> str:
    """Navega a una sección O navega y filtra por categoría."""
    valid_sections = ["inicio", "productos", "sobre-nosotros", "contacto"]
    target_id_section = section.lower().replace(' ', '-')
    
    # Lista de categorías válidas (debe coincidir con los data-category de los botones HTML)
    valid_categories = ["jabones", "serums", "shampoos", "acondicionadores", "cremas", "aceites", "todos"] 
    target_id_category = section.lower().strip() # Usamos el nombre limpio para la categoría
    
    # Primero, verifica si es una sección principal
    if target_id_section in valid_sections:
        target = f"#{target_id_section}"
        return json.dumps({
            "action": "navigate", 
            "target": target, 
            "message": f"Claro, te llevo a la sección {section.title()}."
        })
    
    # Luego, verifica si es una categoría válida
    if target_id_category in valid_categories and target_id_category != 'todos':
        # ¡NUEVA ACCIÓN! Incluye la categoría para filtrar
        return json.dumps({
            "action": "navigate_and_filter", 
            "target": "#productos", 
            "category": target_id_category, # Ej: "jabones"
            "message": f"Entendido, te muestro nuestros {section}."
        })

    # Si no es ni sección ni categoría conocida
    else:
        return json.dumps({
            "action": "error", 
            "message": f"No reconozco la sección o categoría '{section}'. Las opciones son: Inicio, Productos (o sus categorías), Sobre Nosotros y Contacto."
        })

def manipulate_cart(action: str, product_name: str = None) -> str:
    """Maneja acciones del carrito de compras como mostrar, limpiar o añadir productos."""
    if action == "show":
        return json.dumps({"action": "cart_show", "message": "Abriendo tu carrito de compras."})
    elif action == "clear":
        return json.dumps({"action": "cart_clear", "message": "Voy a limpiar tu carrito."})
    elif action == "add" and product_name:
        return json.dumps({"action": "cart_add", "product_name": product_name, "message": f"Entendido, añadiendo {product_name} al carrito."})
    else:
        return json.dumps({"action": "error", "message": f"Acción de carrito no válida: {action} o falta el producto."})

# ======================================================
# 3. CONFIGURACIÓN DE HERRAMIENTAS (MAPEADO)
# ======================================================

tools = {
    "navigate_to_section": navigate_to_section,
    "manipulate_cart": manipulate_cart,
    "get_product_info": get_product_info,
    "list_products_by_category": list_products_by_category 
}

tool_config = [
    navigate_to_section, 
    manipulate_cart, 
    get_product_info,
    list_products_by_category 
]

# ======================================================
# 4. LÓGICA DEL ENRUTADOR DE IA
# ======================================================

def call_local_llm(prompt: str) -> dict:
    # ... (sin cambios) ...
    print(f"[AI Router] Delegando a LLM Local (FAQ)...")
    try:
        response = requests.post(Config.LOCAL_LLM_URL, json={'prompt': prompt}, timeout=10)
        response.raise_for_status()
        data = response.json()
        if not data.get('response'): raise Exception("Respuesta vacía.")
        return {"success": True, "response": data.get('response')}
    except requests.exceptions.ConnectionError:
        print(f"❌ ERROR: No se pudo conectar al LLM Local en {Config.LOCAL_LLM_URL}.")
        return {"success": False, "response": "Error de conexión local."}
    except requests.exceptions.Timeout:
        print(f"❌ ERROR: Timeout al conectar con LLM Local en {Config.LOCAL_LLM_URL}.")
        return {"success": False, "response": "Asistente local tardó."}
    except Exception as e:
        print(f"❌ ERROR: Fallo en LLM Local: {e}")
        return {"success": False, "response": f"Error local: {e}"}


def get_ai_intent(user_prompt: str) -> str:
    # ... (sin cambios) ...
    if not current_app.gemini_is_ready:
        print("Advertencia: Gemini no inicializado, clasificando como 'complex_action'.")
        return "complex_action"
    print(f"[AI Router] Clasificando intención para: '{user_prompt}'")
    try:
        # ... (prompt clasificador sin cambios) ...
        system_prompt_classifier = (
            "Eres un clasificador de intenciones de e-commerce. Tu única tarea es decidir si el prompt del usuario es una 'simple_question' o una 'complex_action'. "
            "Responde ÚNICAMENTE con una palabra: 'simple_question' o 'complex_action'. "
            "simple_question: Preguntas generales, FAQs, saludos, 'qué es', 'quién eres', 'información de la empresa', 'cómo se usa'. "
            "complex_action: Pedidos, comandos, 'quiero', 'agregar', 'comprar', 'muéstrame', 'llévame a', 'cuánto cuesta', 'tienes stock', 'ver carrito', 'qué productos tienes', 'lista los jabones'." 
        )
        model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_prompt_classifier)
        response = model.generate_content(user_prompt, generation_config=genai.GenerationConfig(temperature=0.0))
        intent = response.text.strip().lower()
        if "simple_question" in intent:
            print("[AI Router] Intención detectada: simple_question")
            return "simple_question"
        else:
            print("[AI Router] Intención detectada: complex_action")
            return "complex_action"
    except Exception as e:
        print(f"Error en get_ai_intent: {e}. Asumiendo 'complex_action'.")
        return "complex_action"


def call_gemini_with_tools(prompt: str, history_raw: list) -> dict:
    """Llama a Gemini con el set completo de herramientas (Cloud LLM)."""
    print(f"[AI Router] Delegando a Gemini (Acción Compleja)...")
    try:
        # --- [MODIFICADO] ---
        # Actualizamos las instrucciones del prompt del sistema
        system_prompt = (
            "Eres herbIA, el asistente virtual experto en productos naturales de Bo's Beauty. "
            "Tu rol es recomendar productos y ejecutar ACCIONES usando las herramientas disponibles. "
            "HERRAMIENTAS DISPONIBLES:\n"
            "- navigate_to_section: Navega a secciones (inicio, productos, sobre-nosotros, contacto) O filtra por categoría (jabones, serums, etc.).\n" # <-- Cambio aquí
            "- manipulate_cart: Maneja el carrito (show, clear, add).\n"
            "- get_product_info: Consulta stock/precio de UN producto específico.\n"
            "- list_products_by_category: Lista productos de una categoría o 'todos'.\n"
            "INSTRUCCIONES:\n"
            "- Si piden ir a una SECCIÓN PRINCIPAL (ej: 'llévame a contacto'), usa navigate_to_section con esa sección.\n" # <-- Cambio aquí
            "- Si piden ver una CATEGORÍA (ej: 'muéstrame los aceites'), usa navigate_to_section con esa categoría (la herramienta devolverá action='navigate_and_filter').\n" # <-- Cambio aquí
            "- Si preguntan por stock/precio de ALGO ESPECÍFICO, usa get_product_info.\n"
            "- Si preguntan QUÉ PRODUCTOS TIENES o similar, usa list_products_by_category con categoría 'todos'. Si piden 'lista los jabones', usa list_products_by_category con 'jabones'.\n"
            "- Sé conciso, amable y profesional."
        )

        contents = []
        for msg in history_raw[-10:]:
            if 'text' in msg:
                contents.append({"role": "user" if msg['sender'] == 'user' else "model", "parts": [msg['text']]})
        contents.append({"role": "user", "parts": [prompt]})
        
        model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_prompt, tools=tool_config)
        response = model.generate_content(contents, generation_config=genai.GenerationConfig(temperature=0.3))
        
        # Procesar llamada a herramienta
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            if part.function_call:
                tool_call = part.function_call
                function_name = tool_call.name
                function_args = dict(tool_call.args)
                
                if function_name in tools:
                    result_json_str = tools[function_name](**function_args)
                    result_data = json.loads(result_json_str)
                    
                    # --- [MODIFICADO] ---
                    # Asegurarse de devolver la nueva propiedad 'category' si existe
                    return {
                        "success": True, 
                        "action": result_data.get("action"),
                        "target": result_data.get("target"),
                        "product_name": result_data.get("product_name"),
                        "category": result_data.get("category"), # <-- NUEVO
                        "response": result_data.get("message")
                    }

        # Procesar respuesta de texto simple
        if response.text:
            return {"success": True, "response": response.text}
        else:
            print(f"🚨 ADVERTENCIA GEMINI: Respuesta vacía. Razón: {response.prompt_feedback}")
            return {"success": True, "response": "No pude generar una respuesta."}

    except api_exceptions.PermissionDenied as e:
        print(f"🚨 ERROR FATAL GEMINI: Permiso denegado: {e}")
        return {"success": False, "response": "Error de autenticación API Key."}, 403
    except api_exceptions.GoogleAPIError as e:
        print(f"🚨 ERROR FATAL GEMINI: API Error: {e}")
        return {"success": False, "response": f"Error API Google: {e}"}, 500
    except Exception as e:
        print(f"🚨 ERROR (NO-GEMINI) en call_gemini_with_tools: {e}")
        return {"success": False, "response": "Error interno del servidor."}, 500

# ======================================================
# 5. FUNCIÓN PRINCIPAL DE MANEJO (Handler)
# ======================================================

def handle_chat_request(request):
    # ... (sin cambios en esta función - el fallback sigue igual) ...
    if not current_app.gemini_is_ready and not Config.LOCAL_LLM_URL:
        return fail("Asistente IA no configurado.", 500)
    try:
        data = request.json
        prompt = data.get('prompt', '').strip()
        history_raw = data.get('history', [])
        if not prompt: return fail("Prompt vacío.", 400)
        intent = get_ai_intent(prompt)
        if intent == 'simple_question':
            result = call_local_llm(prompt)
            if not result.get('success'):
                print("⚠️ Fallback a Gemini Cloud...")
                result = call_gemini_with_tools(prompt, history_raw)
        else:
            result = call_gemini_with_tools(prompt, history_raw)
        return jsonify(result) if result.get('success') else (jsonify(result), 500)
    except Exception as e:
        print(f"🚨 ERROR FATAL en handle_chat_request: {e}")
        return fail("Error crítico en enrutador chat.", 500)