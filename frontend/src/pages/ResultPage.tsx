/**
 * ResultPage — Success screen showing the generated plan as a
 * day-by-day schedule. Uses PearlButton as "Start Studying" CTA.
 * Route: /create/result
 *
 * Props flow: Receives generated plan via React Router state
 * (navigate('/create/result', { state: { plan } }))
 * On "Start Studying": calls onStartStudying(plan) to save the plan,
 * then navigates to the dashboard.
 */
import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { GeneratedPlan } from "../types";
import { PearlButton } from "../components/ui/pearl-button";
import StudyPlanCard from "../components/StudyPlanCard";
import PrimaryButton from "../components/PrimaryButton";
import {
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { cn } from "../lib/utils";

interface LocationState {
  plan: GeneratedPlan;
}

interface ResultPageProps {
  onStartStudying: (plan: GeneratedPlan) => void;
}

export default function ResultPage({ onStartStudying }: ResultPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Guard against double-click saving the plan twice
  const savedRef = useRef(false);
  // Router state: receive the generated plan from ReviewPage navigation
  const state = location.state as LocationState | null;
  const plan = state?.plan;

  // Guard: if no plan data, redirect back
  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-text-muted mb-4">No plan data found.</p>
          <PrimaryButton onClick={() => navigate("/create/assignment")}>
            Start Over
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light mb-4">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <h1 className="text-2xl font-bold text-text">
            Your Study Plan is Ready!
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Here's your personalised schedule for {plan.assignmentName}
          </p>
        </div>

        {/* Plan summary card using StudyPlanCard component */}
        <div className="mb-6">
          <StudyPlanCard
            name={plan.assignmentName}
            subject={plan.subject}
            dueDate={plan.dueDate}
            progress={0}
            daysRemaining={plan.totalDays}
          />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <Calendar size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-text">{plan.totalDays}</p>
            <p className="text-xs text-text-muted">Days</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <Clock size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-text">{plan.totalHours}</p>
            <p className="text-xs text-text-muted">Hours</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <BookOpen size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-text">{plan.schedule.length}</p>
            <p className="text-xs text-text-muted">Sessions</p>
          </div>
        </div>

        {/* Day-by-day schedule */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-8">
          <h2 className="text-base font-semibold text-text mb-4">
            Day-by-Day Schedule
          </h2>
          <div className="flex flex-col gap-2">
            {plan.schedule.map((entry, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-4 rounded-xl p-3 transition-colors",
                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                )}
              >
                {/* Day badge */}
                <div className="flex-shrink-0 w-16 text-center">
                  <span className="text-xs font-medium text-primary bg-primary-light px-2 py-1 rounded-lg">
                    {entry.day}
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">{entry.date}</p>
                </div>
                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {entry.task}
                  </p>
                  <p className="text-xs text-text-muted">
                    {entry.timeSlot} · {entry.duration} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Studying CTA — uses the PearlButton */}
        <div className="flex flex-col items-center gap-4 pb-8">
          <p className="text-sm font-medium text-text-muted">
            Ready to begin?
          </p>
          <PearlButton
            label="Start Studying"
            onClick={() => {
              if (!savedRef.current) {
                savedRef.current = true;
                onStartStudying(plan);
              }
              navigate("/dashboard");
            }}
          />
          <PrimaryButton
            variant="secondary"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}