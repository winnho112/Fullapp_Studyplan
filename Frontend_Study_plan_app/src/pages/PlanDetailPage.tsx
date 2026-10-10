/**
 * PlanDetailPage — Shows a saved plan's day-by-day schedule with
 * per-session checkboxes to track study progress.
 * Route: /plan/:planId
 *
 * Props flow: Receives savedPlans array and onUpdatePlan callback from App.
 * Looks up the plan by planId URL param; redirects to dashboard if not found.
 */
import { useNavigate, useParams } from "react-router-dom";
import type { SavedPlan } from "../types";
import StudyPlanCard from "../components/StudyPlanCard";
import PrimaryButton from "../components/PrimaryButton";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

interface PlanDetailPageProps {
  savedPlans: SavedPlan[];
  onUpdatePlan: (plan: SavedPlan) => void;
}

export default function PlanDetailPage({
  savedPlans,
  onUpdatePlan,
}: PlanDetailPageProps) {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const savedPlan = savedPlans.find((p) => p.id === planId);

  // Guard: plan not found
  if (!savedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-text-muted mb-4">Plan not found.</p>
          <PrimaryButton onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const { plan } = savedPlan;
  // Safety: backfill completedSessions if missing (e.g. old localStorage data)
  const completedSessions = Array.isArray(savedPlan.completedSessions)
    ? savedPlan.completedSessions
    : plan.schedule.map(() => false);
  const totalCount = completedSessions.length;
  const completedCount = completedSessions.filter(Boolean).length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  /** Toggle a single session's completion status and persist */
  const handleToggle = (index: number) => {
    const updatedCompleted = [...completedSessions];
    updatedCompleted[index] = !updatedCompleted[index];
    const newCount = updatedCompleted.filter(Boolean).length;
    const newProgress =
      totalCount > 0 ? Math.round((newCount / totalCount) * 100) : 0;

    onUpdatePlan({
      ...savedPlan,
      completedSessions: updatedCompleted,
      progress: newProgress,
    });
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Back to Dashboard */}
        <div className="mb-6">
          <PrimaryButton
            variant="secondary"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </PrimaryButton>
        </div>

        {/* Plan summary card */}
        <div className="mb-6">
          <StudyPlanCard
            name={plan.assignmentName}
            subject={plan.subject}
            dueDate={plan.dueDate}
            progress={progress}
            daysRemaining={savedPlan.daysRemaining}
          />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <p className="text-lg font-bold text-text">{plan.totalDays}</p>
            <p className="text-xs text-text-muted">Days</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <p className="text-lg font-bold text-text">{plan.totalHours}</p>
            <p className="text-xs text-text-muted">Hours</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <p className="text-lg font-bold text-text">
              {completedCount}/{totalCount}
            </p>
            <p className="text-xs text-text-muted">Sessions Done</p>
          </div>
        </div>

        {/* Day-by-day schedule with checkboxes */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-8">
          <h2 className="text-base font-semibold text-text mb-4">
            Day-by-Day Schedule
          </h2>
          {totalCount === 0 ? (
            <p className="text-sm text-text-muted">No sessions scheduled.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {plan.schedule.map((entry, index) => {
                const done = completedSessions[index];
                return (
                  <label
                    key={index}
                    className={cn(
                      "flex items-center gap-4 rounded-xl p-3 transition-colors cursor-pointer",
                      index % 2 === 0 ? "bg-gray-50" : "bg-white",
                      done && "opacity-60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => handleToggle(index)}
                      className="h-5 w-5 rounded cursor-pointer accent-primary"
                    />

                    <div className="flex-shrink-0 w-16 text-center">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-lg",
                          done
                            ? "bg-success-light text-success"
                            : "bg-primary-light text-primary"
                        )}
                      >
                        {entry.day}
                      </span>
                      <p className="text-xs text-text-muted mt-0.5">
                        {entry.date}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          done ? "line-through text-text-muted" : "text-text"
                        )}
                      >
                        {entry.task}
                      </p>
                      <p className="text-xs text-text-muted">
                        {entry.timeSlot} · {entry.duration} min
                      </p>
                    </div>

                    {done && (
                      <CheckCircle2
                        size={18}
                        className="text-success flex-shrink-0"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Completion celebration */}
        {progress === 100 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light mb-4">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h2 className="text-xl font-bold text-text mb-1">
              Congratulations! 🎉
            </h2>
            <p className="text-sm text-text-muted">
              You&apos;ve completed all sessions for {plan.assignmentName}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}