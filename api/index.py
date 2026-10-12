"""
Vercel serverless function entry-point.

Vercel's @vercel/python runtime auto-detects the module-level ``app``
variable.  FastAPI is an ASGI framework, so the runtime uses an ASGI
adapter (uvicorn) to serve the request.
"""

import sys
import os

# Make the backend package importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app  # noqa: E402  – must be importable at module level for Vercel