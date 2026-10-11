/**
 * storage.ts — localStorage persistence for saved study plans
 *
 * Plans are scoped per user: stored under "studyplan.saved-plans.{email}".
 * Legacy data under the old shared key "studyplan.saved-plans" is
 * automatically migrated to the current user's key on first load.
 */
import type { SavedPlan } from "../types";

/** Per-user storage key */
function planKey(userEmail: string): string {
  return `studyplan.saved-plans.${userEmail}`;
}

/** Legacy shared key (before per-user scoping) */
const LEGACY_KEY = "studyplan.saved-plans";

/** Load saved plans for a specific user. Returns [] if missing or corrupt. */
export function loadSavedPlans(userEmail: string): SavedPlan[] {
  if (!userEmail) return [];
  try {
    // Migrate legacy shared data to this user's key on first access
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw && !localStorage.getItem(planKey(userEmail))) {
      localStorage.setItem(planKey(userEmail), legacyRaw);
      localStorage.removeItem(LEGACY_KEY);
    }

    const raw = localStorage.getItem(planKey(userEmail));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Backfill fields for plans saved before they existed
    return parsed.map((p: SavedPlan) => ({
      ...p,
      assignment: p.assignment ?? {
        name: p.plan?.assignmentName ?? "",
        subject: p.plan?.subject ?? "",
        dueDate: p.plan?.dueDate ?? "",
        type: "essay" as const,
        workload: "moderate" as const,
      },
      availability: p.availability ?? {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      },
      preferences: p.preferences ?? {
        sessionLength: "50" as const,
        studyTime: "afternoon" as const,
        breakFrequency: "every-50" as const,
        priority: "balanced" as const,
      },
      completedSessions:
        Array.isArray(p.completedSessions)
          ? p.completedSessions
          : p.plan?.schedule?.map(() => false) ?? [],
    }));
  } catch {
    return [];
  }
}

/** Persist saved plans for a specific user to localStorage. */
export function saveSavedPlans(userEmail: string, plans: SavedPlan[]): void {
  if (!userEmail) return;
  try {
    localStorage.setItem(planKey(userEmail), JSON.stringify(plans));
  } catch {
    // Storage full or unavailable — in-memory state still works
  }
}
