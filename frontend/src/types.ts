/**
 * ============================================================
 * StudyPlan — Shared TypeScript Types
 * ============================================================
 * All data shapes used across the app are defined here.
 * Pages receive data via props and send updates via callbacks.
 * ============================================================
 */

/** Assignment data collected on the Assignment Details page */
export interface AssignmentData {
  name: string;
  subject: string;
  dueDate: string;
  type: "essay" | "report" | "presentation" | "exam-prep" | "project";
  workload: "light" | "moderate" | "heavy";
}

/** Weekly availability in hours per day */
export interface AvailabilityData {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

/** Study preferences collected on the Preferences page */
export interface PreferencesData {
  sessionLength: "25" | "50" | "90";
  studyTime: "morning" | "afternoon" | "evening";
  breakFrequency: "every-25" | "every-50" | "every-90";
  priority: "speed" | "quality" | "balanced";
}

/** A single entry in the generated study plan schedule */
export interface StudyPlanEntry {
  day: string;
  date: string;
  task: string;
  timeSlot: string;
  duration: number; // minutes
  sessionDateISO: string; // "YYYY-MM-DD" for API submission
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

/** The full generated study plan */
export interface GeneratedPlan {
  assignmentName: string;
  subject: string;
  dueDate: string;
  assignmentType: string;
  workload: string;
  totalDays: number;
  totalHours: number;
  schedule: StudyPlanEntry[];
}

/** Dashboard plan card data */
export interface DashboardPlan {
  id: string;
  name: string;
  subject: string;
  dueDate: string;
  progress: number; // 0-100
  daysRemaining: number;
  availability: AvailabilityData;
}

/** A plan saved from the Result screen ("Start Studying") and shown on the dashboard */
export interface SavedPlan {
  id: string;
  createdAt: string;
  plan: GeneratedPlan; // full data incl. day-by-day schedule
  assignment: AssignmentData; // original inputs — needed for regeneration
  availability: AvailabilityData;
  preferences: PreferencesData;
  progress: number; // 0-100
  daysRemaining: number;
  completedSessions: boolean[]; // one per schedule entry, tracks completed sessions
}