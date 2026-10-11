"""
test_database_connection.py — Verify the database connection works.

Run:  python test_database_connection.py
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not set in .env")
    raise SystemExit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT 1")
    result = cur.fetchone()
    if result and result[0] == 1:
        print("Database connection successful")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Database connection failed: {e}")
    raise SystemExit(1)