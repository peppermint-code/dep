# api/index.py

# Importa TU app Flask completa
from flask_app import app

# Exporta el handler WSGI que Vercel necesita
def handler(environ, start_response):
    return app.wsgi_app(environ, start_response)
