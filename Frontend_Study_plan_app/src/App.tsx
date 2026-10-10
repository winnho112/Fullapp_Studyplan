/**
 * App.tsx — Central State + Router for StudyPlan MVP
 *
 * DATA FLOW:
 * 1. PROPS DOWN: App passes assignmentData, availabilityData,
 *    preferencesData to pages via route elements
 * 2. CALLBACKS UP: Pages call onAssignmentComplete(data),
 *    onAvailabilityComplete(data), onPreferencesComplete(data)
 *    to update App state
 * 3. ROUTER STATE: On "Create My Plan", navigate to /create/result
 *    passing the generated plan as router state
 *
 * STATE: All form state lives here so it persists across navigation.
 */
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import type {
  AssignmentData,
  AvailabilityData,
  PreferencesData,
  GeneratedPlan,
  StudyPlanEntry,
  DashboardPlan,
  SavedPlan,
} from "./types";
import { loadSavedPlans, saveSavedPlans } from "./lib/storage";
import { saveCurrentUser, loadCurrentUser, getUserName } from "./lib/auth";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AssignmentDetailsPage from "./pages/AssignmentDetailsPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import PreferencesPage from "./pages/PreferencesPage";
import ReviewPage from "./pages/ReviewPage";
import ResultPage from "./pages/ResultPage";
import PlanDetailPage from "./pages/PlanDetailPage";

/** Map a saved plan to the dashboard card data shape */
function toDashboardPlan(saved: SavedPlan): DashboardPlan {
  return {
    id: saved.id,
    name: saved.plan.assignmentName,
    subject: saved.plan.subject,
    dueDate: saved.plan.dueDate,
    progress: saved.progress,
    daysRemaining: saved.daysRemaining,
    availability: saved.availability,
  };
}

/** Calculate days remaining until the due date (minimum 1) */
function calcDaysRemaining(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - today.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
}

// Rule-based plan generation — no AI, no backend
function generateStudyPlan(
  assignment: AssignmentData,
  availability: AvailabilityData,
  preferences: PreferencesData
): GeneratedPlan {
  const today = new Date();
  const due = new Date(assignment.dueDate);
  const diffTime = due.getTime() - today.getTime();
  const daysRemaining = Math.max(
    Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
    1
  );

  // Tasks based on workload
  let tasks: string[];
  if (assignment.workload === "heavy" && daysRemaining <= 5) {
    tasks = [
      "Research & gather sources",
      "Analyse data",
      "Draft findings",
      "Write recommendations",
      "Review & edit",
    ];
  } else if (assignment.workload === "heavy") {
    tasks = [
      "Research & gather sources",
      "Analyse data",
      "Create outline",
      "Draft findings",
      "Write recommendations",
      "Review & edit",
      "Final polish",
    ];
  } else if (assignment.workload === "moderate") {
    tasks = ["Research", "Draft", "Review", "Finalise"];
  } else {
    tasks = ["Plan", "Write", "Submit"];
  }

  // Time slot from preferred study time
  const timeSlots: Record<string, string> = {
    morning: "9:00 AM - 12:00 PM",
    afternoon: "1:00 PM - 5:00 PM",
    evening: "6:00 PM - 10:00 PM",
  };
  const timeSlot = timeSlots[preferences.studyTime] || "Flexible";
  const sessionDuration = Number(preferences.sessionLength);

  // Build day-by-day schedule
  const dayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const dayKeys: (keyof AvailabilityData)[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const schedule: StudyPlanEntry[] = [];
  let taskIndex = 0;
  const currentDate = new Date(today);

  for (
    let dayOffset = 0;
    dayOffset < daysRemaining && taskIndex < tasks.length;
    dayOffset++
  ) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const dayOfWeek = checkDate.getDay();
    const dayKeyIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayKey = dayKeys[dayKeyIndex];
    const hoursAvailable = availability[dayKey];

    if (hoursAvailable > 0 && taskIndex < tasks.length) {
      const sessionsPerDay = Math.max(
        1,
        Math.floor((hoursAvailable * 60) / (sessionDuration + 10))
      );
      for (
        let s = 0;
        s < sessionsPerDay && taskIndex < tasks.length;
        s++
      ) {
        schedule.push({
          day: dayNames[dayKeyIndex],
          date: checkDate.toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
          }),
          task: tasks[taskIndex],
          timeSlot,
          duration: sessionDuration,
        });
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
    });
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
  // CENTRAL STATE — persists across page navigation
  const [assignment, setAssignment] = useState<AssignmentData>({
    name: "",
    subject: "",
    dueDate: "",
    type: "essay",
    workload: "moderate",
  });

  const [availability, setAvailability] = useState<AvailabilityData>({
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  });

  const [preferences, setPreferences] = useState<PreferencesData>({
    sessionLength: "50",
    studyTime: "afternoon",
    breakFrequency: "every-50",
    priority: "balanced",
  });

  // CURRENT USER — persisted session (email or null)
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    loadCurrentUser()
  );
  const [currentUserName, setCurrentUserName] = useState<string>(() =>
    currentUser ? getUserName(currentUser) : ""
  );

  // SAVED PLANS — scoped to the current user, persisted in localStorage
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(() =>
    currentUser ? loadSavedPlans(currentUser) : []
  );

  // CALLBACKS UP — pages call these to update App state
  const handleAssignmentComplete = (data: AssignmentData) =>
    setAssignment(data);
  const handleAvailabilityComplete = (data: AvailabilityData) =>
    setAvailability(data);
  const handlePreferencesComplete = (data: PreferencesData) =>
    setPreferences(data);
  const handleLogin = (email: string, name: string) => {
    saveCurrentUser(email);
    setCurrentUser(email);
    setCurrentUserName(name);
    setSavedPlans(loadSavedPlans(email));
  };

  // PLAN GENERATION — called from ReviewPage
  const handleGeneratePlan = (): GeneratedPlan => {
    return generateStudyPlan(assignment, availability, preferences);
  };

  // SAVE PLAN — called from ResultPage's "Start Studying" button
  const handleStartStudying = (plan: GeneratedPlan) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const saved: SavedPlan = {
      id,
      createdAt: new Date().toISOString(),
      plan,
      assignment,
      availability,
      preferences,
      progress: 0,
      daysRemaining: plan.totalDays,
      completedSessions: plan.schedule.map(() => false),
    };
    setSavedPlans((prev) => {
      const next = [saved, ...prev];
      if (currentUser) saveSavedPlans(currentUser, next);
      return next;
    });
  };

  // UPDATE PLAN — called from PlanDetailPage when sessions are toggled
  const handleUpdatePlan = (updated: SavedPlan) => {
    setSavedPlans((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      if (currentUser) saveSavedPlans(currentUser, next);
      return next;
    });
  };

  // DELETE PLAN — called from DashboardPage delete confirmation
  const handleDeletePlan = (planId: string) => {
    setSavedPlans((prev) => {
      const next = prev.filter((p) => p.id !== planId);
      if (currentUser) saveSavedPlans(currentUser, next);
      return next;
    });
  };

  // EDIT PLAN — called from DashboardPage edit modal
  // Regenerates the schedule when availability changes
  const handleEditPlan = (
    planId: string,
    updates: {
      name: string;
      subject: string;
      dueDate: string;
      availability: AvailabilityData;
    }
  ) => {
    setSavedPlans((prev) => {
      const next = prev.map((p) => {
        if (p.id !== planId) return p;

        // Rebuild assignment data with updates
        const updatedAssignment: AssignmentData = {
          ...p.assignment,
          name: updates.name,
          subject: updates.subject,
          dueDate: updates.dueDate,
        };

        // Regenerate the schedule with new availability
        const newPlan = generateStudyPlan(
          updatedAssignment,
          updates.availability,
          p.preferences
        );

        return {
          ...p,
          assignment: updatedAssignment,
          availability: updates.availability,
          plan: newPlan,
          progress: 0,
          daysRemaining: calcDaysRemaining(updates.dueDate),
          completedSessions: newPlan.schedule.map(() => false),
        };
      });
      if (currentUser) saveSavedPlans(currentUser, next);
      return next;
    });
  };

  return (
    <Routes>
      {/* / → Login */}
      <Route path="/" element={<LoginPage onLogin={handleLogin} />} />

      {/* /dashboard → Saved plans (persisted in localStorage) */}
      <Route
        path="/dashboard"
        element={
          <DashboardPage
            dashboardPlans={savedPlans.map(toDashboardPlan)}
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
      <Route
        path="/plan/:planId"
        element={
          <PlanDetailPage
            savedPlans={savedPlans}
            onUpdatePlan={handleUpdatePlan}
          />
        }
      />
    </Routes>
  );
}