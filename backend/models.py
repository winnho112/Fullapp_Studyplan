"""
models.py — Pydantic models for request / response validation.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import date


# ── Auth ───────────────────────────────────────────────────────

class SignUpRequest(BaseModel):
    email: str
    password: str
    username: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Availability ───────────────────────────────────────────────

class AvailabilityCreate(BaseModel):
    monday: float = 0
    tuesday: float = 0
    wednesday: float = 0
    thursday: float = 0
    friday: float = 0
    saturday: float = 0
    sunday: float = 0


class AvailabilityResponse(AvailabilityCreate):
    id: str
    plan_id: str


# ── Preferences ────────────────────────────────────────────────

class PreferencesCreate(BaseModel):
    session_length: str          # "25" | "50" | "90"
    preferred_study_time: str    # morning | afternoon | evening
    break_frequency: str         # every-25 | every-50 | every-90
    priority: str                # speed | quality | balanced


class PreferencesResponse(PreferencesCreate):
    id: str
    plan_id: str


# ── Study Sessions (for creation inside a plan) ────────────────

class SessionCreate(BaseModel):
    session_date: date
    start_time: str   # "HH:MM"
    end_time: str      # "HH:MM"
    task_name: str


# ── Study Plans ────────────────────────────────────────────────

class StudyPlanCreate(BaseModel):
    assignment_name: str
    subject: str
    due_date: date
    assignment_type: str         # essay | report | presentation | exam-prep | project
    workload: str                # light | moderate | heavy
    availability: AvailabilityCreate
    preferences: PreferencesCreate
    sessions: list[SessionCreate] = []


class StudyPlanUpdate(BaseModel):
    assignment_name: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[date] = None
    assignment_type: Optional[str] = None
    workload: Optional[str] = None
    status: Optional[str] = None
    availability: Optional[AvailabilityCreate] = None
    preferences: Optional[PreferencesCreate] = None


class StudyPlanResponse(BaseModel):
    id: str
    user_id: str
    assignment_name: str
    subject: str
    due_date: str
    assignment_type: str
    workload: str
    status: str
    created_at: str
    availability: Optional[AvailabilityResponse] = None
    preferences: Optional[PreferencesResponse] = None
    total_sessions: int = 0
    completed_sessions: int = 0
    completion_percentage: float = 0.0


# ── Study Sessions ─────────────────────────────────────────────

class StudySessionResponse(BaseModel):
    id: str
    plan_id: str
    session_date: str
    start_time: str
    end_time: str
    task_name: str
    is_completed: bool
    note: Optional[str] = None


class ProgressResponse(BaseModel):
    plan_id: str
    total_sessions: int
    completed_sessions: int
    completion_percentage: float