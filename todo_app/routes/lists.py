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

    # Enforce maximum list constraint (10 Custom Lists capacity)
    if TodoList.query.filter_by(user_id=current_user.id).count() >= 10:
        return jsonify({'error': 'Capacity limit reached. You can only manage up to 10 custom lists.'}), 403
    
    new_list = TodoList(name=data['name'], user_id=current_user.id)
    db.session.add(new_list)
    db.session.commit()
    return jsonify(new_list.to_dict()), 201

@lists_bp.route('/api/lists/<int:list_id>', methods=['PUT', 'PATCH'])
@login_required
def rename_list(list_id):
    todo_list = TodoList.query.filter_by(id=list_id, user_id=current_user.id).first()
    if not todo_list:
        return jsonify({'error': 'List not found or unauthorized'}), 404
        
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
        
    todo_list.name = data['name'][:100]
    db.session.commit()
    return jsonify(todo_list.to_dict()), 200

@lists_bp.route('/api/lists/<int:list_id>', methods=['DELETE'])
@login_required
def delete_list(list_id):
    todo_list = TodoList.query.filter_by(id=list_id, user_id=current_user.id).first()
    if not todo_list:
        return jsonify({'error': 'List not found or unauthorized'}), 404
        
    delete_tasks = request.args.get('delete_tasks', 'false').lower() == 'true'
    
    from todo_app.models import Task
    if delete_tasks:
        Task.query.filter_by(list_id=list_id, user_id=current_user.id).delete()
    else:
        Task.query.filter_by(list_id=list_id, user_id=current_user.id).update({Task.list_id: None})
        
    db.session.delete(todo_list)
    db.session.commit()
    return jsonify({'success': True}), 200

