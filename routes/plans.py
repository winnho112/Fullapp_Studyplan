"""
routes/plans.py — CRUD endpoints for study plans.

GET    /plans              List all plans for the logged-in user (with progress)
POST   /plans              Create a new plan (with availability + preferences + sessions)
PUT    /plans/{plan_id}    Update an existing plan
DELETE /plans/{plan_id}    Delete a plan and all related data (CASCADE)
"""

from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from database import get_connection
from models import StudyPlanCreate, StudyPlanUpdate, StudyPlanResponse

router = APIRouter(tags=["Study Plans"])


# ── Helpers ────────────────────────────────────────────────────

def _row_to_plan(row, avail=None, pref=None, total=0, completed=0) -> dict:
    pct = round(completed / total * 100, 2) if total > 0 else 0.0
    plan = {
        "id": str(row[0]), "user_id": str(row[1]),
        "assignment_name": row[2], "subject": row[3],
        "due_date": str(row[4]), "assignment_type": row[5],
        "workload": row[6], "status": row[7],
        "created_at": str(row[8]),
        "total_sessions": total,
        "completed_sessions": completed,
        "completion_percentage": pct,
    }
    if avail:
        plan["availability"] = {
            "id": str(avail[0]), "plan_id": str(avail[1]),
            "monday": float(avail[2]), "tuesday": float(avail[3]),
            "wednesday": float(avail[4]), "thursday": float(avail[5]),
            "friday": float(avail[6]), "saturday": float(avail[7]),
            "sunday": float(avail[8]),
        }
    if pref:
        plan["preferences"] = {
            "id": str(pref[0]), "plan_id": str(pref[1]),
            "session_length": pref[2], "preferred_study_time": pref[3],
            "break_frequency": pref[4], "priority": pref[5],
        }
    return plan


def _session_counts(cur, plan_id: str) -> tuple[int, int]:
    """Return (total_sessions, completed_sessions) for a plan."""
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
    return total, completed


def _fetch_full_plan(conn, plan_id: str) -> dict:
    cur = conn.cursor()
    cur.execute("SELECT * FROM public.study_plans WHERE id = %s", (plan_id,))
    plan_row = cur.fetchone()
    if not plan_row:
        cur.close()
        return None
    cur.execute("SELECT * FROM public.availability WHERE plan_id = %s", (plan_id,))
    avail_row = cur.fetchone()
    cur.execute("SELECT * FROM public.preferences WHERE plan_id = %s", (plan_id,))
    pref_row = cur.fetchone()
    total, completed = _session_counts(cur, plan_id)
    cur.close()
    return _row_to_plan(plan_row, avail_row, pref_row, total, completed)


def _verify_plan_owner(conn, plan_id: str, user_id: str):
    cur = conn.cursor()
    cur.execute("SELECT user_id FROM public.study_plans WHERE id = %s", (plan_id,))
    row = cur.fetchone()
    cur.close()
    if not row or str(row[0]) != user_id:
        raise HTTPException(status_code=404, detail="Plan not found")


# ── Endpoints ──────────────────────────────────────────────────

@router.get("/plans", response_model=list[StudyPlanResponse])
def list_plans(user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM public.study_plans WHERE user_id = %s ORDER BY created_at DESC",
        (user["user_id"],),
    )
    plan_rows = cur.fetchall()
    plans = []
    for pr in plan_rows:
        pid = pr[0]
        cur.execute("SELECT * FROM public.availability WHERE plan_id = %s", (pid,))
        avail = cur.fetchone()
        cur.execute("SELECT * FROM public.preferences WHERE plan_id = %s", (pid,))
        pref = cur.fetchone()
        total, completed = _session_counts(cur, pid)
        plans.append(_row_to_plan(pr, avail, pref, total, completed))
    cur.close()
    conn.close()
    return plans


@router.post("/plans", response_model=StudyPlanResponse, status_code=201)
def create_plan(body: StudyPlanCreate, user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO public.study_plans
                   (user_id, assignment_name, subject, due_date, assignment_type, workload)
               VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
            (user["user_id"], body.assignment_name, body.subject,
             body.due_date, body.assignment_type, body.workload),
        )
        plan_id = cur.fetchone()[0]
        a = body.availability
        cur.execute(
            """INSERT INTO public.availability
                   (plan_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (plan_id, a.monday, a.tuesday, a.wednesday, a.thursday,
             a.friday, a.saturday, a.sunday),
        )
        p = body.preferences
        cur.execute(
            """INSERT INTO public.preferences
                   (plan_id, session_length, preferred_study_time, break_frequency, priority)
               VALUES (%s,%s,%s,%s,%s)""",
            (plan_id, p.session_length, p.preferred_study_time,
             p.break_frequency, p.priority),
        )
        # Insert study sessions (batch)
        for s in body.sessions:
            cur.execute(
                """INSERT INTO public.study_sessions
                       (plan_id, session_date, start_time, end_time, task_name)
                   VALUES (%s,%s,%s,%s,%s)""",
                (plan_id, s.session_date, s.start_time, s.end_time, s.task_name),
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
    plan = _fetch_full_plan(conn, plan_id)
    conn.close()
    return plan


@router.put("/plans/{plan_id}", response_model=StudyPlanResponse)
def update_plan(plan_id: str, body: StudyPlanUpdate, user: dict = Depends(get_current_user)):
    conn = get_connection()
    _verify_plan_owner(conn, plan_id, user["user_id"])
    cur = conn.cursor()
    try:
        fields, values = [], []
        for f in ("assignment_name","subject","due_date","assignment_type","workload","status"):
            v = getattr(body, f, None)
            if v is not None:
                fields.append(f"{f} = %s")
                values.append(v)
        if fields:
            values.append(plan_id)
            cur.execute(f"UPDATE public.study_plans SET {', '.join(fields)} WHERE id = %s", values)
        if body.availability:
            a = body.availability
            cur.execute(
                """UPDATE public.availability
                   SET monday=%s,tuesday=%s,wednesday=%s,thursday=%s,
                       friday=%s,saturday=%s,sunday=%s WHERE plan_id=%s""",
                (a.monday, a.tuesday, a.wednesday, a.thursday,
                 a.friday, a.saturday, a.sunday, plan_id),
            )
        if body.preferences:
            p = body.preferences
            cur.execute(
                """UPDATE public.preferences
                   SET session_length=%s, preferred_study_time=%s,
                       break_frequency=%s, priority=%s WHERE plan_id=%s""",
                (p.session_length, p.preferred_study_time,
                 p.break_frequency, p.priority, plan_id),
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
    plan = _fetch_full_plan(conn, plan_id)
    conn.close()
    return plan


@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: str, user: dict = Depends(get_current_user)):
    conn = get_connection()
    _verify_plan_owner(conn, plan_id, user["user_id"])
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM public.study_plans WHERE id = %s", (plan_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()
    return {"message": "Plan deleted successfully"}