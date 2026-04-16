import os
import secrets

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(16)
    
    # Handle Render's DATABASE_URL (postgres:// -> postgresql://)
    _db_url = os.environ.get('DATABASE_URL')
    if _db_url and _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    
    SQLALCHEMY_DATABASE_URI = _db_url or 'sqlite:///' + os.path.join(basedir, 'todo.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
