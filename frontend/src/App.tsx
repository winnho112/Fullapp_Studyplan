/**
 * App.tsx — Central State + Router for StudyPlan MVP
 *
 * All data is persisted in the FastAPI backend via API calls.
 * Plan generation happens on the frontend; the result is POSTed
 * to the backend along with the generated sessions.
 */
import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import type {
  AssignmentData,
  AvailabilityData,
  PreferencesData,
  GeneratedPlan,
  StudyPlanEntry,
  DashboardPlan,
} from "./types";
import { loadCurrentUser, getUserName, saveSession, clearCurrentUser } from "./lib/auth";
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

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayKeys: (keyof AvailabilityData)[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const slot = TIME_SLOTS[preferences.studyTime] || TIME_SLOTS.afternoon;
  const sessionDuration = Number(preferences.sessionLength);

  // 1. Build array of study days (dates where user has availability > 0)
  //    Stop 1 day before the deadline as a buffer
  const bufferDate = new Date(due);
  bufferDate.setDate(bufferDate.getDate() - 1);

  const studyDays: { date: Date; dayName: string }[] = [];
  const cursor = new Date(today);
  while (cursor < bufferDate) {
    const dow = cursor.getDay(); // 0=Sun, 1=Mon, ...
    const keyIndex = dow === 0 ? 6 : dow - 1;
    if (availability[dayKeys[keyIndex]] > 0) {
      studyDays.push({ date: new Date(cursor), dayName: dayNames[keyIndex] });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // 2. Determine task names based on workload
  let tasks: string[];
  if (assignment.workload === "heavy" && studyDays.length <= 5) {
    tasks = ["Research & gather sources", "Analyse data", "Draft findings", "Write recommendations", "Review & edit"];
  } else if (assignment.workload === "heavy") {
    tasks = ["Research & gather sources", "Analyse data", "Create outline", "Draft findings", "Write recommendations", "Review & edit", "Final polish"];
  } else if (assignment.workload === "moderate") {
    tasks = ["Research", "Draft", "Review", "Finalise"];
  } else {
    tasks = ["Plan", "Write", "Submit"];
  }

  // 3. Distribute days across tasks based on priority preference
  let totalDaysToUse = studyDays.length;
  const taskDayCounts: number[] = new Array(tasks.length).fill(0);

  if (preferences.priority === "speed") {
    // finish_early — use ~75% of days, leave buffer at the end
    totalDaysToUse = Math.max(tasks.length, Math.floor(studyDays.length * 0.75));
  }
  // "quality" and "balanced" use all available days

  if (preferences.priority === "quality") {
    // difficult_first — weight earlier tasks more heavily
    const weights = tasks.map((_, i) => tasks.length - i);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let assigned = 0;
    for (let i = 0; i < tasks.length; i++) {
      taskDayCounts[i] = Math.max(1, Math.round((weights[i] / totalWeight) * totalDaysToUse));
      assigned += taskDayCounts[i];
    }
    // Adjust rounding to match totalDaysToUse exactly
    let diff = assigned - totalDaysToUse;
    // If we over-assigned, trim from last tasks
    for (let i = tasks.length - 1; i >= 0 && diff > 0; i--) {
      const trim = Math.min(diff, taskDayCounts[i] - 1);
      taskDayCounts[i] -= trim;
      diff -= trim;
    }
    // If we under-assigned, add to first tasks
    for (let i = 0; i < tasks.length && diff < 0; i++) {
      taskDayCounts[i]++;
      diff++;
    }
  } else {
    // balanced or speed — divide equally (speed just uses fewer total days)
    const base = Math.floor(totalDaysToUse / tasks.length);
    const extra = totalDaysToUse % tasks.length;
    for (let i = 0; i < tasks.length; i++) {
      taskDayCounts[i] = Math.max(1, base + (i < extra ? 1 : 0));
    }
  }

  // 4. Generate sessions — one per study day, labelled with day-of-task
  const schedule: StudyPlanEntry[] = [];
  let dayIndex = 0;

  for (let t = 0; t < tasks.length; t++) {
    const daysForTask = taskDayCounts[t];
    for (let d = 0; d < daysForTask && dayIndex < studyDays.length; d++) {
      const sd = studyDays[dayIndex];
      const label = daysForTask > 1
        ? `${tasks[t]} (Day ${d + 1} of ${daysForTask})`
        : tasks[t];

      schedule.push({
        day: sd.dayName,
        date: sd.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
        task: label,
        timeSlot: slot.label,
        duration: sessionDuration,
        sessionDateISO: toISODate(sd.date),
        startTime: slot.start,
        endTime: slot.end,
      });

      dayIndex++;
    }
  }

  const totalHours = Math.round((schedule.length * sessionDuration) / 60);
  const daysRemaining = Math.max(Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 1);

  return {
    assignmentName: assignment.name,
    subject: assignment.subject,
    dueDate: assignment.dueDate,
    assignmentType: assignment.type,
    workload: assignment.workload,
    totalDays: daysRemaining,
    totalHours,
    schedule,
  };
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function App() {
  const navigate = useNavigate();

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

  const handleLogout = () => {
    clearCurrentUser();
    setCurrentUser(null);
    setCurrentUserName("");
    setDashboardPlans([]);
    navigate("/");
  };

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
            onLogout={handleLogout}
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