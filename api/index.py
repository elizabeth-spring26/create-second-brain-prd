"""
Vercel entrypoint — imports the Flask app from server/app.py so Vercel's
Python runtime can serve it as a WSGI function.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "server"))

from app import app  # noqa: E402
