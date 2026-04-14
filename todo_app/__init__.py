from flask import Flask
import sys
import os

# Add root dir to path so we can import config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import Config
from todo_app.extensions import db, login_manager, migrate

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login_manager.login_view = 'pages.login'
    login_manager.init_app(app)
    migrate.init_app(app, db)

    from todo_app.models import User
    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # Register blueprints
    from todo_app.routes.auth import auth_bp
    from todo_app.routes.tasks import tasks_bp
    from todo_app.routes.pages import pages_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(pages_bp)

    return app
