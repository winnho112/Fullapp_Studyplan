/**
 * auth.ts — localStorage-based account management for sign-up / login
 *
 * Accounts are stored as a simple JSON array under the key "studyplan.accounts".
 * Passwords are stored in plaintext (demo/portfolio app — not production-grade).
 */
export interface Account {
  name: string;
  email: string;
  password: string;
}

const STORAGE_KEY = "studyplan.accounts";

/** Load all stored accounts. Returns [] if empty or corrupt. */
export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Backfill name for accounts saved before that field existed
    return parsed.map((a: Account) => ({
      ...a,
      name: a.name || a.email.split("@")[0],
    }));
  } catch {
    return [];
  }
}

/** Append a new account to localStorage. */
export function saveAccount(account: Account): void {
  const accounts = loadAccounts();
  accounts.push(account);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Storage full or unavailable — account won't persist across refresh
  }
}

/** Check whether an account with matching email + password exists. */
export function findAccount(email: string, password: string): boolean {
  const accounts = loadAccounts();
  return accounts.some(
    (a) => a.email === email && a.password === password
  );
}

/** Check whether an email is already registered (regardless of password). */
export function emailExists(email: string): boolean {
  const accounts = loadAccounts();
  return accounts.some((a) => a.email === email);
}

/** Get the display name for a registered email. Returns email prefix if not found. */
export function getUserName(email: string): string {
  const accounts = loadAccounts();
  const account = accounts.find((a) => a.email === email);
  return account?.name || email.split("@")[0];
}

// ── Session management (current logged-in user) ──────────────────

const USER_KEY = "studyplan.current-user";

/** Persist the logged-in user's email to localStorage. */
export function saveCurrentUser(email: string): void {
  try {
    localStorage.setItem(USER_KEY, email);
  } catch {
    // Storage unavailable — session won't persist across refresh
  }
}

/** Load the logged-in user's email. Returns null if not logged in. */
export function loadCurrentUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

/** Clear the current user session (logout). */
export function clearCurrentUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore
  }
}