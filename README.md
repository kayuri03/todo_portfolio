# To-Do List Portfolio Project

Welcome! This repository tracks the development of a functional To-Do List application.

## Overview

This project is being built to showcase software development practices, including version control, project structure, and proper tracking.

## Technologies

- Python 3.13
- Git
- Flask (Backend API & Blueprints)
- Flask-Migrate (Database Migrations)

## Developer Cheat Sheet

### Create a Virtual Environment

```bash
# macOS/Linux
python3 -m venv .venv
# Windows
py -3 -m venv .venv
```

### Activate the Virtual Environment

```bash
# macOS/Linux
. .venv/bin/activate
# Windows
.venv\Scripts\activate
```

### Run Database Migrations

We use `Flask-Migrate` so we never have to wipe the database when adding features.

**1. Create a Migration Script**
Whenever you modify `todo_app/models.py` (e.g. adding a new column), run this to auto-generate the upgrade script:

```powershell
$env:FLASK_APP="app.py"
flask db migrate -m "Added new feature column"
```

**2. Apply the Migration to the Database**
Run this to physically update the `todo.db` SQLite file securely without data loss:

```powershell
$env:FLASK_APP="app.py"
flask db upgrade
```

### Running the Application Local Server

The server will be available at port `5001` by default. Run this command to start the Flask development server:

```bash
python app.py
```
