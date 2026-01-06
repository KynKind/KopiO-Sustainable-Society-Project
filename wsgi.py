import sys
import os

# Add the backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Change to backend directory so relative imports work
os.chdir(backend_path)

# Import the Flask app
from app import app as application
