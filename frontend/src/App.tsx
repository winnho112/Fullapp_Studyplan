/**
 * App.tsx — Central State + Router for StudyPlan MVP
 *
 * All data is persisted in the FastAPI backend via API calls.
 * Plan generation happens on the frontend; the result is POSTed
 * to the backend along with the generated sessions.
 */
import { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import type {
  AssignmentData,
  AvailabilityData,
  PreferencesData,
  GeneratedPlan,
  StudyPlanEntry,
  DashboardPlan,
} from "./types";
import { loadCurrentUser, getUserName, saveSession } from "./lib/auth";
import {
  apiLogin,
  apiSignup,
  apiGetPlans,
  apiCreatePlan,
  apiUpdatePlan,
  apiDeletePlan,
  type ApiPlan,
} from "./lib/api";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AssignmentDetailsPage from "./pages/AssignmentDetailsPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import PreferencesPage from "./pages/PreferencesPage";
import ReviewPage from "./pages/ReviewPage";
import ResultPage from "./pages/ResultPage";
import PlanDetailPage from "./pages/PlanDetailPage";

/** Calculate days remaining until the due date (minimum 1) */
function calcDaysRemaining(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - today.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
}

/** Map an API plan response to the DashboardPlan shape */
function apiPlanToDashboard(p: ApiPlan): DashboardPlan {
  return {
    id: p.id,
    name: p.assignment_name,
    subject: p.subject,
    dueDate: p.due_date,
    progress: p.completion_percentage,
    daysRemaining: calcDaysRemaining(p.due_date),
    availability: p.availability ?? {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0,
    },
  };
}

/** Return "YYYY-MM-DD" for a Date */
function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Time slot definitions based on preferred study time */
const TIME_SLOTS: Record<string, { label: string; start: string; end: string }> = {
  morning:   { label: "9:00 AM - 12:00 PM", start: "09:00", end: "12:00" },
  afternoon: { label: "1:00 PM - 5:00 PM",  start: "13:00", end: "17:00" },
  evening:   { label: "6:00 PM - 10:00 PM", start: "18:00", end: "22:00" },
};

// Rule-based plan generation — no AI, no backend
function generateStudyPlan(
  assignment: AssignmentData,
  availability: AvailabilityData,
  preferences: PreferencesData
): GeneratedPlan {
  const today = new Date();
  const due = new Date(assignment.dueDate);
  const diffTime = due.getTime() - today.getTime();
  const daysRemaining = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);

  // Tasks based on workload
  let tasks: string[];
  if (assignment.workload === "heavy" && daysRemaining <= 5) {
    tasks = ["Research & gather sources", "Analyse data", "Draft findings", "Write recommendations", "Review & edit"];
  } else if (assignment.workload === "heavy") {
    tasks = ["Research & gather sources", "Analyse data", "Create outline", "Draft findings", "Write recommendations", "Review & edit", "Final polish"];
  } else if (assignment.workload === "moderate") {
    tasks = ["Research", "Draft", "Review", "Finalise"];
  } else {
    tasks = ["Plan", "Write", "Submit"];
  }

  const slot = TIME_SLOTS[preferences.studyTime] || TIME_SLOTS.afternoon;
  const sessionDuration = Number(preferences.sessionLength);

  // Build day-by-day schedule with proper ISO dates and HH:MM times
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayKeys: (keyof AvailabilityData)[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const schedule: StudyPlanEntry[] = [];
  let taskIndex = 0;
  const currentDate = new Date(today);

  for (let dayOffset = 0; dayOffset < daysRemaining && taskIndex < tasks.length; dayOffset++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const dayOfWeek = checkDate.getDay();
    const dayKeyIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayKey = dayKeys[dayKeyIndex];
    const hoursAvailable = availability[dayKey];

    if (hoursAvailable > 0 && taskIndex < tasks.length) {
      const sessionsPerDay = Math.max(1, Math.floor((hoursAvailable * 60) / (sessionDuration + 10)));
      for (let s = 0; s < sessionsPerDay && taskIndex < tasks.length; s++) {
        schedule.push({
          day: dayNames[dayKeyIndex],
          date: checkDate.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
          task: tasks[taskIndex],
          timeSlot: slot.label,
          duration: sessionDuration,
          // Extra fields for backend (not in type but carried through)
          sessionDateISO: toISODate(checkDate),
          startTime: slot.start,
          endTime: slot.end,
        } as StudyPlanEntry & { sessionDateISO: string; startTime: string; endTime: string });
        taskIndex++;
      }
    }
  }

  // Fill remaining tasks into flexible slots
  while (taskIndex < tasks.length) {
    schedule.push({
      day: "Flexible",
      date: "As needed",
      task: tasks[taskIndex],
      timeSlot: "Flexible",
      duration: sessionDuration,
      sessionDateISO: toISODate(today),
      startTime: slot.start,
      endTime: slot.end,
    } as StudyPlanEntry & { sessionDateISO: string; startTime: string; endTime: string });
    taskIndex++;
  }

  const totalHours = Math.round((schedule.length * sessionDuration) / 60);

  return {
    assignmentName: assignment.name,
    subject: assignment.subject,
    dueDate: assignment.dueDate,
    totalDays: daysRemaining,
    totalHours,
    schedule,
  };
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function App() {
  // CENTRAL STATE — form data persists across page navigation
  const [assignment, setAssignment] = useState<AssignmentData>({
    name: "", subject: "", dueDate: "", type: "essay", workload: "moderate",
  });
  const [availability, setAvailability] = useState<AvailabilityData>({
    monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0,
  });
  const [preferences, setPreferences] = useState<PreferencesData>({
    sessionLength: "50", studyTime: "afternoon", breakFrequency: "every-50", priority: "balanced",
  });

  // CURRENT USER — persisted session
  const [currentUser, setCurrentUser] = useState<string | null>(() => loadCurrentUser());
  const [currentUserName, setCurrentUserName] = useState<string>(() =>
    currentUser ? getUserName(currentUser) : ""
  );

  // DASHBOARD PLANS — fetched from backend API
  const [dashboardPlans, setDashboardPlans] = useState<DashboardPlan[]>([]);

  // Fetch plans from API whenever user logs in
  const refreshPlans = useCallback(async () => {
    try {
      const plans = await apiGetPlans();
      setDashboardPlans(plans.map(apiPlanToDashboard));
    } catch {
      setDashboardPlans([]);
    }
  }, []);

  useEffect(() => {
    if (currentUser) refreshPlans();
  }, [currentUser, refreshPlans]);

  // CALLBACKS UP
  const handleAssignmentComplete = (data: AssignmentData) => setAssignment(data);
  const handleAvailabilityComplete = (data: AvailabilityData) => setAvailability(data);
  const handlePreferencesComplete = (data: PreferencesData) => setPreferences(data);

  const handleLogin = async (email: string, password: string, name?: string) => {
    try {
      if (name) {
        // Signup flow
        await apiSignup(email, password, name);
      }
      // Login (after signup or direct login)
      const result = await apiLogin(email, password);
      saveSession(result.access_token, result.refresh_token, result.user.email, name || email.split("@")[0]);
      setCurrentUser(result.user.email);
      setCurrentUserName(name || email.split("@")[0]);
      return true;
    } catch (err) {
      throw err; // Let LoginPage handle the error
    }
  };

  // PLAN GENERATION — called from ReviewPage
  const handleGeneratePlan = (): GeneratedPlan => {
    return generateStudyPlan(assignment, availability, preferences);
  };

  // SAVE PLAN — POST plan + sessions to backend
  const handleStartStudying = async (plan: GeneratedPlan) => {
    try {
      // Map preference values for backend
      const breakMap: Record<string, string> = { "every-25": "every-25", "every-50": "every-50", "every-90": "every-90" };
      const priorityMap: Record<string, string> = { speed: "speed", quality: "quality", balanced: "balanced" };

      // Build sessions array from generated schedule
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessions = plan.schedule.map((entry: any) => ({
        session_date: entry.sessionDateISO || plan.dueDate,
        start_time: entry.startTime || "09:00",
        end_time: entry.endTime || "10:00",
        task_name: entry.task,
      }));

      await apiCreatePlan({
        assignment_name: plan.assignmentName,
        subject: plan.subject,
        due_date: plan.dueDate,
        assignment_type: assignment.type === "exam-prep" ? "exam-prep" : assignment.type,
        workload: assignment.workload,
        availability,
        preferences: {
          session_length: preferences.sessionLength,
          preferred_study_time: preferences.studyTime,
          break_frequency: breakMap[preferences.breakFrequency] || "every-50",
          priority: priorityMap[preferences.priority] || "balanced",
        },
        sessions,
      });
      await refreshPlans();
    } catch (err) {
      console.error("Failed to save plan:", err);
    }
  };

  // DELETE PLAN
  const handleDeletePlan = async (planId: string) => {
    try {
      await apiDeletePlan(planId);
      await refreshPlans();
    } catch (err) {
      console.error("Failed to delete plan:", err);
    }
  };

  // EDIT PLAN
  const handleEditPlan = async (
    planId: string,
    updates: { name: string; subject: string; dueDate: string; availability: AvailabilityData },
  ) => {
    try {
      await apiUpdatePlan(planId, {
        assignment_name: updates.name,
        subject: updates.subject,
        due_date: updates.dueDate,
        availability: updates.availability,
      });
      await refreshPlans();
    } catch (err) {
      console.error("Failed to update plan:", err);
    }
  };

  return (
    <Routes>
      {/* / → Login */}
      <Route path="/" element={<LoginPage onLogin={handleLogin} />} />

      {/* /dashboard → Plans fetched from backend API */}
      <Route
        path="/dashboard"
        element={
          <DashboardPage
            dashboardPlans={dashboardPlans}
            userName={currentUserName}
            onEditPlan={handleEditPlan}
            onDeletePlan={handleDeletePlan}
          />
        }
      />

      {/* /create/assignment → Step 1 */}
      <Route
        path="/create/assignment"
        element={
          <AssignmentDetailsPage
            assignmentData={assignment}
            onAssignmentComplete={handleAssignmentComplete}
          />
        }
      />

      {/* /create/availability → Step 2 */}
      <Route
        path="/create/availability"
        element={
          <AvailabilityPage
            availabilityData={availability}
            onAvailabilityComplete={handleAvailabilityComplete}
          />
        }
      />

      {/* /create/preferences → Step 3 */}
      <Route
        path="/create/preferences"
        element={
          <PreferencesPage
            preferencesData={preferences}
            onPreferencesComplete={handlePreferencesComplete}
          />
        }
      />

      {/* /create/review → Summary + generate plan */}
      <Route
        path="/create/review"
        element={
          <ReviewPage
            assignmentData={assignment}
            availabilityData={availability}
            preferencesData={preferences}
            onGeneratePlan={handleGeneratePlan}
          />
        }
      />

      {/* /create/result → Generated plan + PearlButton */}
      <Route
        path="/create/result"
        element={<ResultPage onStartStudying={handleStartStudying} />}
      />

      {/* /plan/:planId → View and manage a saved plan's sessions */}
      <Route path="/plan/:planId" element={<PlanDetailPage />} />
    </Routes>
  );
}