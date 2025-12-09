# /home/genichurro/Documentos/v2/IA/app/db_logic.py
# --- RESPONSABILIDAD ---
# 1. Contener TODA la lógica de interacción con la base de datos (Supabase).
# 2. Manejar la lógica de las rutas de /api/products (GET, POST).
# 3. Proveer la función 'get_product_info' como herramienta para la IA.
# --- [MEJORA] ---
# - 'get_product_info' usa Full-Text Search (fts).
# - [NUEVO] Se añadió la herramienta 'list_products_by_category'
#   para que la IA pueda responder a "¿Qué productos tienes?".

import os
import json
import requests
from flask import jsonify, url_for
from werkzeug.utils import secure_filename

# Importamos la configuración (SUPABASE_URL, KEYS, etc.)
from app.config import Config

# ======================================================
# 1. FUNCIONES HELPER (SUPABASE Y JSON)
# ======================================================

def fail(message, code=400):
    """Genera una respuesta de error JSON estándar."""
    error_log = f"API Error [{code}]: {message}"
    print(error_log)
    return jsonify({'success': False, 'message': message}), code

def supabase_request(method, endpoint, body=None, use_service_key=False, custom_headers=None):
    """Función centralizada para realizar peticiones a la API REST de Supabase."""
    
    key = Config.SUPABASE_SERVICE_KEY if use_service_key else Config.SUPABASE_ANON_KEY
    if not key:
        raise Exception("Clave de Supabase (SERVICE o ANON) no disponible.")

    url = f"{Config.SUPABASE_URL}/rest/v1/{Config.SUPABASE_TABLE}{endpoint}"
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': f'Bearer {key}'
    }

    if custom_headers:
        headers.update(custom_headers)

    try:
        if body and method != 'GET':
            response = requests.request(method, url, headers=headers, json=body, timeout=15)
        else:
            response = requests.request(method, url, headers=headers, timeout=15)
        
        response.raise_for_status()
        
        if response.status_code == 204:
            return {'success': True, 'http_code': 204}
        
        if not response.content:
            return {'success': True, 'http_code': response.status_code}

        return response.json()
    
    except requests.exceptions.HTTPError as errh:
        error_message = "Error desconocido"
        try:
            error_message = errh.response.json().get('message', str(errh))
        except json.JSONDecodeError:
            error_message = str(errh)
        raise Exception(f"Supabase HTTP Error {errh.response.status_code}: {error_message}")
    except Exception as e:
        raise Exception(f"Error de conexión a Supabase: {e}")

# ======================================================
# 2. LÓGICA DE RUTAS (/api/products)
# ======================================================

def handle_products_get():
    """Maneja la lógica para peticiones GET a /api/products."""
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
        return fail(f"Error al cargar productos: {e}", 500)

def handle_products_post(request):
    """Maneja la lógica para peticiones POST a /api/products (Create, Update, Delete, Import)."""
    
    data = {}
    action = None
    
    if request.content_type.startswith('application/json'):
        data = request.json
        action = data.get('action')
    elif request.content_type.startswith('multipart/form-data'):
        data = request.form.to_dict()
        action = data.get('action')
    else:
        try:
            data = request.json
            action = data.get('action')
        except Exception:
            return fail("Formato de contenido no soportado. Usar 'application/json' or 'multipart/form-data'.", 415)

    if not action:
        return fail("No se proporcionó ninguna 'action'.", 400)

    try:
        if action == 'create':
            image_url = data.get('productImageUrl', '')
            if 'productImageFile' in request.files:
                file = request.files['productImageFile']
                if file and file.filename != '':
                    filename = secure_filename(file.filename)
                    unique_name = f"prod_{os.urandom(4).hex()}-{filename}"
                    file.save(os.path.join(Config.UPLOAD_FOLDER, unique_name))
                    image_url = url_for('static', filename=f'uploads/{unique_name}', _external=True)
            
            if not image_url:
                 raise Exception("Debes proporcionar una imagen (subir archivo o URL).")
            
            ingredients_list = json.loads(data.get('ingredients', '[]'))
            
            payload = {
                'name': data.get('name'),
                'price': float(data.get('price', 0)),
                'category': data.get('category'),
                'stock': int(data.get('stock', 10)),
                'featured': data.get('featured') == 'true',
                'description': data.get('description'),
                'ingredients': ','.join(ingredients_list),
                'image': image_url
            }
            endpoint = '?select=id'
            result = supabase_request('POST', endpoint, [payload], use_service_key=True)
            return jsonify({'success': True, 'message': 'Producto creado exitosamente.', 'new_id': result[0]['id']})
        
        elif action == 'update':
            product_id = data.get('id')
            if not product_id:
                raise Exception("Falta 'id' del producto para actualizar.")
            
            payload = {}
            if 'name' in data: payload['name'] = data.get('name')
            if 'price' in data: payload['price'] = float(data.get('price', 0))
            if 'category' in data: payload['category'] = data.get('category')
            if 'stock' in data: payload['stock'] = int(data.get('stock', 10))
            if 'featured' in data: payload['featured'] = data.get('featured') == 'true'
            if 'description' in data: payload['description'] = data.get('description')
            if 'ingredients' in data:
                ingredients_list = json.loads(data.get('ingredients', '[]'))
                payload['ingredients'] = ','.join(ingredients_list)
            if 'productImageUrl' in data: 
                payload['image'] = data.get('productImageUrl')

            if not payload:
                raise Exception("No se proporcionaron datos para actualizar.")

            endpoint = f"?id=eq.{product_id}"
            supabase_request('PATCH', endpoint, payload, use_service_key=True)
            return jsonify({'success': True, 'message': 'Producto actualizado.'})

        elif action == 'delete':
            product_id = data.get('id')
            if not product_id:
                raise Exception("Falta ID para eliminar.")
            endpoint = f"?id=eq.{product_id}"
            supabase_request('DELETE', endpoint, None, use_service_key=True)
            return jsonify({'success': True, 'message': 'Producto eliminado.'})
        
        elif action == 'import':
            products_to_import = data.get('products', [])
            if not products_to_import:
                raise Exception("No se encontraron productos para importar.")
            
            payloads = []
            for product in products_to_import:
                payloads.append({
                    'id': product['id'],
                    'name': product['name'],
                    'price': float(product['price']),
                    'category': product['category'],
                    'stock': int(product.get('stock', 10)),
                    'featured': bool(product.get('featured', False)),
                    'description': product['description'],
                    'ingredients': ','.join(product.get('ingredients', [])),
                    'image': product['image']
                })
            
            endpoint = '?on_conflict=id'
            custom_headers = {'Prefer': 'resolution=merge-duplicates'}
            supabase_request('POST', endpoint, payloads, use_service_key=True, custom_headers=custom_headers)
            return jsonify({'success': True, 'message': f"{len(payloads)} productos importados/actualizados.", 'count': len(payloads)})
        
        else:
            return fail(f"Acción '{action}' no reconocida.", 400)
    
    except Exception as e:
        print(f"Error POST products (Action: {action}): {e}")
        return fail(f"Error al procesar la acción: {e}", 500)

# ======================================================
# 3. HERRAMIENTAS DE IA (Acceso a BD)
# ======================================================

def get_product_info(product_name: str) -> str:
    """
    [HERRAMIENTA DE IA] Consulta Supabase para obtener el stock y precio
    de un producto específico.
    """
    print(f"[Tool Call - DB] Buscando stock para: {product_name}")
    try:
        search_term = product_name.replace(" ", " & ")
        endpoint = f"?select=name,stock,price&name=fts(es).{search_term}"
        products = supabase_request('GET', endpoint)
        
        if not products:
            return json.dumps({"action": "info", "message": f"Lo siento, no pude encontrar un producto que coincida con '{product_name}'. ¿Puedes intentarlo de nuevo?"})
        
        if len(products) > 3:
             nombres = [p['name'] for p in products[:3]]
             return json.dumps({"action": "info", "message": f"Encontré varios productos: {', '.join(nombres)}... ¿A cuál te refieres?"})

        responses = []
        for p in products:
            if p['stock'] > 0:
                responses.append(f"El producto '{p['name']}' cuesta ${p['price']} y tenemos {p['stock']} unidades disponibles.")
            else:
                responses.append(f"El producto '{p['name']}' cuesta ${p['price']} pero está agotado temporalmente.")
        
        message = " ".join(responses)
        return json.dumps({"action": "info", "message": message})

    except Exception as e:
        print(f"Error en get_product_info: {e}")
        return json.dumps({"action": "error", "message": "Tuve un problema al consultar la base de datos."})

# --- [NUEVO] Herramienta de IA para listar productos ---
def list_products_by_category(category: str) -> str:
    """
    [HERRAMIENTA DE IA] Lista productos de una categoría específica.
    Si la categoría es 'all', lista una muestra de todos los productos.
    """
    print(f"[Tool Call - DB] Listando productos para: {category}")
    try:
        endpoint = "?select=name" # Solo necesitamos los nombres
        
        category_clean = category.lower().strip()
        
        if category_clean != 'all' and category_clean != 'todos':
            # Filtra por la categoría solicitada (ej. 'jabones')
            endpoint += f"&category=eq.{category_clean}"
        
        products = supabase_request('GET', endpoint)
        
        if not products:
            return json.dumps({"action": "info", "message": f"Lo siento, no encontré productos en la categoría '{category}'."})

        product_names = [p['name'] for p in products]
        
        message_intro = ""
        if category_clean == 'all' or category_clean == 'todos':
            message_intro = "Claro, aquí tienes algunos de nuestros productos principales:"
        else:
            message_intro = f"Claro, aquí tienes nuestros productos en la categoría '{category_clean}':"

        # Evitar una respuesta de chat demasiado larga
        if len(product_names) > 7:
            message_body = ", ".join(product_names[:7]) + ", y más."
        else:
            message_body = ", ".join(product_names) + "."
        
        return json.dumps({"action": "info", "message": f"{message_intro} {message_body}"})

    except Exception as e:
        print(f"Error en list_products_by_category: {e}")
        return json.dumps({"action": "error", "message": "Tuve un problema al listar los productos."})