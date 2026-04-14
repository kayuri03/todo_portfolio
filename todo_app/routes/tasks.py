from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timedelta, timezone
from todo_app.models import Task
from todo_app.extensions import db

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    # v0.4.3 Lazy Garbage Collection: Purge archived tasks older than 15 days
    purge_threshold = datetime.now(timezone.utc) - timedelta(days=15)
    Task.query.filter(
        Task.user_id == current_user.id,
        Task.archived == True,
        Task.archived_at != None,
        Task.archived_at < purge_threshold
    ).delete()
    db.session.commit()

    show_archived = request.args.get('archived', 'false').lower() == 'true'
    list_id = request.args.get('list_id')
    
    query = Task.query.filter_by(user_id=current_user.id, archived=show_archived, parent_id=None)
    if list_id:
        query = query.filter_by(list_id=list_id)
        
    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks])

@tasks_bp.route('/api/tasks', methods=['POST'])
@login_required
def add_task():
    data = request.json
    if not data or not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400
    
    # Parse metadata
    priority = data.get('priority', 'None')
    due_date_str = data.get('due_date')
    due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00')) if due_date_str else None
    parent_id = data.get('parent_id')

    new_task = Task(title=data['title'], author=current_user, priority=priority, due_date=due_date, parent_id=parent_id)
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
    if 'priority' in data:
        task.priority = data['priority']
    if 'due_date' in data:
        due_date_str = data['due_date']
        task.due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00')) if due_date_str else None
    if 'archived' in data:
        task.archived = data['archived']
        if task.archived:
            task.archived_at = datetime.now(timezone.utc)
        else:
            task.archived_at = None
    if 'list_id' in data:
        task.list_id = data['list_id']
        
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
