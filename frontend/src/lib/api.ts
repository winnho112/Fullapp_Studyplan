/**
 * api.ts — Centralised API client for the FastAPI backend.
 *
 * Every function attaches the Supabase JWT from localStorage so
 * the backend can identify the current user.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ── Low-level fetch wrapper ────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("studyplan.access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────

export async function apiSignup(
  email: string,
  password: string,
  username: string,
) {
  return apiFetch<{ message: string; user: { id: string; email: string } }>(
    "/auth/signup",
    {
      method: "POST",
      body: JSON.stringify({ email, password, username }),
    },
  );
}

export async function apiLogin(email: string, password: string) {
  return apiFetch<{
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Plans ──────────────────────────────────────────────────────

export interface ApiPlan {
  id: string;
  user_id: string;
  assignment_name: string;
  subject: string;
  due_date: string;
  assignment_type: string;
  workload: string;
  status: string;
  created_at: string;
  availability: {
    id: string;
    plan_id: string;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  } | null;
  preferences: {
    id: string;
    plan_id: string;
    session_length: string;
    preferred_study_time: string;
    break_frequency: string;
    priority: string;
  } | null;
  total_sessions: number;
  completed_sessions: number;
  completion_percentage: number;
}

export async function apiGetPlans(): Promise<ApiPlan[]> {
  return apiFetch<ApiPlan[]>("/plans");
}

export async function apiCreatePlan(planData: {
  assignment_name: string;
  subject: string;
  due_date: string;
  assignment_type: string;
  workload: string;
  availability: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  preferences: {
    session_length: string;
    preferred_study_time: string;
    break_frequency: string;
    priority: string;
  };
  sessions: {
    session_date: string;
    start_time: string;
    end_time: string;
    task_name: string;
  }[];
}): Promise<ApiPlan> {
  return apiFetch<ApiPlan>("/plans", {
    method: "POST",
    body: JSON.stringify(planData),
  });
}

export async function apiUpdatePlan(
  planId: string,
  updates: Record<string, unknown>,
): Promise<ApiPlan> {
  return apiFetch<ApiPlan>(`/plans/${planId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function apiDeletePlan(planId: string) {
  return apiFetch<{ message: string }>(`/plans/${planId}`, {
    method: "DELETE",
  });
}

// ── Sessions ───────────────────────────────────────────────────

export interface ApiSession {
  id: string;
  plan_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  task_name: string;
  is_completed: boolean;
}

export async function apiGetSessions(
  planId: string,
): Promise<ApiSession[]> {
  return apiFetch<ApiSession[]>(`/plans/${planId}/sessions`);
}

export async function apiToggleSession(sessionId: string) {
  return apiFetch<{ id: string; is_completed: boolean }>(
    `/sessions/${sessionId}/complete`,
    { method: "PATCH" },
  );
}

export async function apiGetProgress(planId: string) {
  return apiFetch<{
    plan_id: string;
    total_sessions: number;
    completed_sessions: number;
    completion_percentage: number;
  }>(`/plans/${planId}/progress`);
}