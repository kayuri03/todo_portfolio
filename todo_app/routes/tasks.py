from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from todo_app.models import Task
from todo_app.extensions import db

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    tasks = Task.query.filter_by(user_id=current_user.id).order_by(Task.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks])

@tasks_bp.route('/api/tasks', methods=['POST'])
@login_required
def add_task():
    data = request.json
    if not data or not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400
    
    new_task = Task(title=data['title'], author=current_user)
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@tasks_bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return jsonify({'error': 'Task not found or unauthorized'}), 404
        
    data = request.json
    if 'completed' in data:
        task.completed = data['completed']
    if 'title' in data:
        task.title = data['title']
        
    db.session.commit()
    return jsonify(task.to_dict())

@tasks_bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return jsonify({'error': 'Task not found or unauthorized'}), 404
        
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True}), 200
