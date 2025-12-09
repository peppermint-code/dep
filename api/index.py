from flask_app import app  # importa tu Flask app principal

# handler WSGI para Vercel
def handler(environ, start_response):
    return app(environ, start_response)
