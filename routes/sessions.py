"""
routes/sessions.py — Study session endpoints.

GET   /plans/{plan_id}/sessions          List all sessions for a plan
PATCH /sessions/{session_id}/complete    Toggle completion status
GET   /plans/{plan_id}/progress          Completion percentage
"""

from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from database import get_connection

router = APIRouter(tags=["Study Sessions"])


def _verify_plan_owner(conn, plan_id: str, user_id: str):
    cur = conn.cursor()
    cur.execute("SELECT user_id FROM public.study_plans WHERE id = %s", (plan_id,))
    row = cur.fetchone()
    cur.close()
    if not row or str(row[0]) != user_id:
        raise HTTPException(status_code=404, detail="Plan not found")


def _serialize_session(row) -> dict:
    return {
        "id": str(row[0]),
        "plan_id": str(row[1]),
        "session_date": str(row[2]),
        "start_time": str(row[3]),
        "end_time": str(row[4]),
        "task_name": row[5],
        "is_completed": row[6],
    }


# ── Endpoints ──────────────────────────────────────────────────

@router.get("/plans/{plan_id}/sessions")
def list_sessions(plan_id: str, user: dict = Depends(get_current_user)):
    """Return every study session for a plan."""
    conn = get_connection()
    _verify_plan_owner(conn, plan_id, user["user_id"])
    cur = conn.cursor()
    cur.execute(
        """SELECT * FROM public.study_sessions
           WHERE plan_id = %s ORDER BY session_date, start_time""",
        (plan_id,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [_serialize_session(r) for r in rows]


@router.patch("/sessions/{session_id}/complete")
def toggle_complete(session_id: str, user: dict = Depends(get_current_user)):
    """Toggle is_completed on a session (True ↔ False)."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Verify the session belongs to one of the user's plans
        cur.execute(
            """SELECT s.id, s.is_completed FROM public.study_sessions s
               JOIN public.study_plans p ON s.plan_id = p.id
               WHERE s.id = %s AND p.user_id = %s""",
            (session_id, user["user_id"]),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")

        new_val = not row[1]
        cur.execute(
            "UPDATE public.study_sessions SET is_completed = %s WHERE id = %s",
            (new_val, session_id),
        )
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

    return {"id": session_id, "is_completed": new_val}


@router.get("/plans/{plan_id}/progress")
def get_progress(plan_id: str, user: dict = Depends(get_current_user)):
    """Return completion stats for a plan."""
    conn = get_connection()
    _verify_plan_owner(conn, plan_id, user["user_id"])
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM public.study_sessions WHERE plan_id = %s",
        (plan_id,),
    )
    total = cur.fetchone()[0]
    cur.execute(
        "SELECT COUNT(*) FROM public.study_sessions WHERE plan_id = %s AND is_completed = TRUE",
        (plan_id,),
    )
    completed = cur.fetchone()[0]
    cur.close()
    conn.close()

    pct = (completed / total * 100) if total > 0 else 0.0
    return {
        "plan_id": plan_id,
        "total_sessions": total,
        "completed_sessions": completed,
        "completion_percentage": round(pct, 2),
    }