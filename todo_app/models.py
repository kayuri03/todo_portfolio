from flask_login import UserMixin
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from todo_app.extensions import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)
    tasks = db.relationship('Task', backref='author', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class TodoList(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', name='fk_list_user_id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    tasks = db.relationship('Task', backref='todo_list', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # v0.3.0 fields
    priority = db.Column(db.String(20), default='None')
    due_date = db.Column(db.DateTime, nullable=True)
    
    # v0.4.0 fields
    archived = db.Column(db.Boolean, default=False)
    
    # v0.4.3 fields
    archived_at = db.Column(db.DateTime, nullable=True)
    
    # v0.5.0 fields (Subtasks)
    parent_id = db.Column(db.Integer, db.ForeignKey('task.id', name='fk_task_parent_id', ondelete='CASCADE'), nullable=True)
    subtasks = db.relationship('Task', backref=db.backref('parent', remote_side=[id]), cascade="all, delete-orphan", lazy=True)

    # v0.6.0 fields (Custom Lists)
    list_id = db.Column(db.Integer, db.ForeignKey('todo_list.id', name='fk_task_list_id', ondelete='SET NULL'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'completed': self.completed,
            'created_at': self.created_at.isoformat(),
            'user_id': self.user_id,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'archived': self.archived,
            'archived_at': self.archived_at.isoformat() if self.archived_at else None,
            'parent_id': self.parent_id,
            'list_id': self.list_id,
            'subtasks': [sub.to_dict() for sub in self.subtasks] if self.subtasks else []
        }
