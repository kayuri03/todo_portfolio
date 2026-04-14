from flask import Blueprint, render_template, redirect, url_for
from flask_login import login_required, current_user

pages_bp = Blueprint('pages', __name__)

@pages_bp.route('/')
@login_required
def index():
    return render_template('index.html', user=current_user)

@pages_bp.route('/login', methods=['GET'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('pages.index'))
    return render_template('login.html')

@pages_bp.route('/register', methods=['GET'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('pages.index'))
    return render_template('register.html')
