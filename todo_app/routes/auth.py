from flask import Blueprint, request, jsonify, redirect, url_for
from flask_login import login_user, logout_user, login_required, current_user
from todo_app.models import User
from todo_app.extensions import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    
    if user and user.check_password(password):
        login_user(user)
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Invalid email or password'}), 401

@auth_bp.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
        
    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    login_user(user)
    return jsonify({'success': True}), 201

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('pages.login'))
