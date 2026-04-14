from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from todo_app.models import TodoList, Task
from todo_app.extensions import db

lists_bp = Blueprint('lists', __name__)

@lists_bp.route('/api/lists', methods=['GET'])
@login_required
def get_lists():
    lists = TodoList.query.filter_by(user_id=current_user.id).all()
    return jsonify([l.to_dict() for l in lists])

@lists_bp.route('/api/lists', methods=['POST'])
@login_required
def create_list():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    
    new_list = TodoList(name=data['name'], user_id=current_user.id)
    db.session.add(new_list)
    db.session.commit()
    return jsonify(new_list.to_dict()), 201

@lists_bp.route('/api/lists/<int:list_id>', methods=['DELETE'])
@login_required
def delete_list(list_id):
    todo_list = TodoList.query.filter_by(id=list_id, user_id=current_user.id).first()
    if not todo_list:
        return jsonify({'error': 'List not found'}), 404
    
    # Optional: Handle tasks in the list (orphan them or delete them)
    # Current behavior: they stay as orphaned tasks (list_id becomes null)
    db.session.delete(todo_list)
    db.session.commit()
    return jsonify({'success': True})
