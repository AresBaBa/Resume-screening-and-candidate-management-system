from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_caching import Cache
from dotenv import load_dotenv
import os

load_dotenv()

from config import config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cache = Cache()


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    if os.environ.get('DATABASE_URL'):
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    if os.environ.get('REDIS_URL'):
        app.config['REDIS_URL'] = os.environ.get('REDIS_URL')
        app.config['CACHE_REDIS_URL'] = os.environ.get('REDIS_URL')

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cache.init_app(app)

    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    from app.routes import auth, jobs, resumes, ai
    app.register_blueprint(auth.bp)
    app.register_blueprint(jobs.bp)
    app.register_blueprint(resumes.bp)
    app.register_blueprint(ai.bp)

    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'resume-screening-api'}

    return app
