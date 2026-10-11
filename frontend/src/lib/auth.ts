/**
 * auth.ts - Authentication helpers backed by the FastAPI + Supabase API.
 *
 * Tokens are persisted in localStorage so the user stays logged in
 * across page refreshes.
 */

const TOKEN_KEY = "studyplan.access_token";
const REFRESH_KEY = "studyplan.refresh_token";
const USER_KEY = "studyplan.current-user";
const NAME_KEY = "studyplan.current-name";

export function saveSession(
  accessToken: string,
  refreshToken: string,
  email: string,
  name: string,
): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, email);
  localStorage.setItem(NAME_KEY, name);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function loadCurrentUser(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function getUserName(_email: string): string {
  return localStorage.getItem(NAME_KEY) || _email.split("@")[0];
}

export function clearCurrentUser(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(NAME_KEY);
}
