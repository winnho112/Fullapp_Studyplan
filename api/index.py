import sys
import os

# Add backend folder to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, os.path.abspath(backend_path))

# Also add backend's parent so relative imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.main import app
