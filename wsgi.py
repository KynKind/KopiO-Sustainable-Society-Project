"""
WSGI configuration for PythonAnywhere deployment

This file sets up the Python path and working directory correctly
so that the Flask app can import its modules using relative imports.

IMPORTANT: This changes the working directory to the backend folder.
All file operations in the Flask app should use absolute paths or be
aware that they are executed from the backend directory.

Usage in PythonAnywhere WSGI configuration file:
    import sys
    path = '/home/KOPIO/KopiO-Sustainable-Society-Project-main'
    if path not in sys.path:
        sys.path.insert(0, path)
    
    from wsgi import application
"""
import sys
import os

# Get the directory containing this file (repository root)
path = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(path, 'backend')

# Add paths to sys.path if not already present
if path not in sys.path:
    sys.path.insert(0, path)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Change working directory to backend so relative imports work
# This is necessary because app.py imports modules like 'config', 'auth', etc.
# without the 'backend.' prefix. All file operations in the app should use
# absolute paths or be aware of this directory change.
os.chdir(backend_path)

# Now import the Flask app from the backend directory
# Since backend_path is in sys.path, we can import directly
from app import app as application

# Export for PythonAnywhere
__all__ = ['application']
