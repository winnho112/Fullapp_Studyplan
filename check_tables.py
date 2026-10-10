"""
check_tables.py — Verify all 5 tables and the auth trigger exist.

Run:  python check_tables.py
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not set in .env")
    raise SystemExit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

tables = ["profiles", "study_plans", "availability", "preferences", "study_sessions"]

print("Checking tables...")
all_found = True
for table in tables:
    cur.execute(
        """SELECT EXISTS (
               SELECT FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = %s
           )""",
        (table,),
    )
    exists = cur.fetchone()[0]
    status = "✓ found" if exists else "✗ NOT found"
    print(f"  {table:20s} — {status}")
    if not exists:
        all_found = False

print("\nChecking trigger...")
cur.execute(
    """SELECT EXISTS (
           SELECT FROM information_schema.triggers
           WHERE trigger_name = 'on_auth_user_created'
       )""",
)
trigger_exists = cur.fetchone()[0]
status = "✓ found" if trigger_exists else "✗ NOT found"
print(f"  on_auth_user_created  — {status}")

cur.close()
conn.close()

if all_found and trigger_exists:
    print("\n✅ All 5 tables and the trigger are present.")
else:
    print("\n⚠  Some items are missing. Run setup.sql in the Supabase SQL Editor.")