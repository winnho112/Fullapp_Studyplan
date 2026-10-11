"""
database.py — Database connection and auto-initialisation.

Loads DATABASE_URL from .env, provides get_connection(), and
creates all five tables + the auth trigger when the server starts.
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# ── connection helper ──────────────────────────────────────────

def get_connection():
    """Return a new psycopg2 connection to the Supabase database."""
    return psycopg2.connect(DATABASE_URL)

# ── table creation SQL (mirrors setup.sql) ─────────────────────

_CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS public.profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username   TEXT,
    email      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_name TEXT NOT NULL,
    subject         TEXT NOT NULL,
    due_date        DATE NOT NULL,
    assignment_type TEXT NOT NULL
        CHECK (assignment_type IN ('essay','report','presentation','exam-prep','project')),
    workload        TEXT NOT NULL
        CHECK (workload IN ('light','moderate','heavy')),
    status          TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','completed')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.availability (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id   UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    monday    NUMERIC(4,2) DEFAULT 0,
    tuesday   NUMERIC(4,2) DEFAULT 0,
    wednesday NUMERIC(4,2) DEFAULT 0,
    thursday  NUMERIC(4,2) DEFAULT 0,
    friday    NUMERIC(4,2) DEFAULT 0,
    saturday  NUMERIC(4,2) DEFAULT 0,
    sunday    NUMERIC(4,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.preferences (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id              UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    session_length       TEXT NOT NULL
        CHECK (session_length IN ('25', '50', '90')),
    preferred_study_time TEXT NOT NULL
        CHECK (preferred_study_time IN ('morning','afternoon','evening')),
    break_frequency      TEXT NOT NULL
        CHECK (break_frequency IN ('every-25','every-50','every-90')),
    priority             TEXT NOT NULL
        CHECK (priority IN ('speed','quality','balanced'))
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id       UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    session_date  DATE NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    task_name     TEXT NOT NULL,
    is_completed  BOOLEAN DEFAULT FALSE
);
"""

_CREATE_TRIGGER = """
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'username',
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
"""

# ── init function ──────────────────────────────────────────────

def init_database():
    """Create all five tables (IF NOT EXISTS) and the auth trigger."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(_CREATE_TABLES)

        # The trigger requires access to the auth schema.
        # If this fails (e.g. insufficient privileges), the tables
        # are still created — the trigger can be set up via setup.sql.
        try:
            cur.execute(_CREATE_TRIGGER)
        except Exception as trigger_err:
            print(f"⚠  Trigger creation skipped (run setup.sql manually): {trigger_err}")

        conn.commit()
        print("Database initialization completed successfully")
    except Exception as e:
        conn.rollback()
        print(f"Database initialization failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    init_database()