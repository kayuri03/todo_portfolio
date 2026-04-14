from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from todo_app.models import TodoList
from todo_app.extensions import db

lists_bp = Blueprint('lists', __name__)

@lists_bp.route('/api/lists', methods=['GET'])
@login_required
def get_lists():
    user_lists = TodoList.query.filter_by(user_id=current_user.id).order_by(TodoList.created_at.asc()).all()
    return jsonify([lst.to_dict() for lst in user_lists])

@lists_bp.route('/api/lists', methods=['POST'])
@login_required
def create_list():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'name is required'}), 400
    
    new_list = TodoList(name=data['name'], user_id=current_user.id)
    db.session.add(new_list)
    db.session.commit()
    return jsonify(new_list.to_dict()), 201
