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
    session_length: int          # 25 | 50 | 90
    preferred_study_time: str    # morning | afternoon | evening
    break_frequency: str         # every_25min | every_50min | when_needed
    priority: str                # finish_early | balanced | difficult_first


class PreferencesResponse(PreferencesCreate):
    id: str
    plan_id: str


# ── Study Plans ────────────────────────────────────────────────

class StudyPlanCreate(BaseModel):
    assignment_name: str
    subject: str
    due_date: date
    assignment_type: str         # essay | report | presentation | exam | project
    workload: str                # light | moderate | heavy
    availability: AvailabilityCreate
    preferences: PreferencesCreate


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


# ── Study Sessions ─────────────────────────────────────────────

class StudySessionResponse(BaseModel):
    id: str
    plan_id: str
    session_date: str
    start_time: str
    end_time: str
    task_name: str
    is_completed: bool


class ProgressResponse(BaseModel):
    plan_id: str
    total_sessions: int
    completed_sessions: int
    completion_percentage: float