/**
 * ReviewPage — Read-only summary of all inputs with Back and
 * "Create My Plan" buttons
 * Route: /create/review
 *
 * Props flow: Receives all 3 data objects from App
 * On "Create My Plan": calls generatePlan and navigates via router state
 */
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import type { AssignmentData, AvailabilityData, PreferencesData } from "../types";
import { ArrowLeft, Sparkles } from "lucide-react";

interface ReviewPageProps {
  assignmentData: AssignmentData;
  availabilityData: AvailabilityData;
  preferencesData: PreferencesData;
  onGeneratePlan: () => import("../types").GeneratedPlan;
}

/** Helper to display a label-value row */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  );
}

/** Map day keys to human-readable labels */
const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export default function ReviewPage({
  assignmentData,
  availabilityData,
  preferencesData,
  onGeneratePlan,
}: ReviewPageProps) {
  const navigate = useNavigate();

  const handleCreatePlan = () => {
    // Generate the plan using App's rule-based algorithm
    const plan = onGeneratePlan();
    // Router state: pass generated plan to the Result screen
    navigate("/create/result", { state: { plan } });
  };

  // Build availability summary string
  const availSummary = Object.entries(availabilityData)
    .filter(([, h]) => h > 0)
    .map(([day, h]) => `${DAY_LABELS[day]}: ${h}h`)
    .join(", ");

  const totalHours = Object.values(availabilityData).reduce((s, h) => s + h, 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-bold text-text mb-1">Review Your Plan</h1>
        <p className="text-sm text-text-muted mb-6">
          Double-check everything before we generate your study schedule.
        </p>

        {/* Assignment section */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-4">
          <h2 className="text-base font-semibold text-text mb-3">Assignment</h2>
          <SummaryRow label="Name" value={assignmentData.name || "—"} />
          <SummaryRow label="Subject" value={assignmentData.subject || "—"} />
          <SummaryRow label="Due Date" value={assignmentData.dueDate || "—"} />
          <SummaryRow label="Type" value={assignmentData.type} />
          <SummaryRow label="Workload" value={assignmentData.workload} />
        </div>

        {/* Availability section */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-4">
          <h2 className="text-base font-semibold text-text mb-3">Availability</h2>
          <SummaryRow label="Schedule" value={availSummary || "No availability set"} />
          <SummaryRow label="Total" value={`${totalHours} hours/week`} />
        </div>

        {/* Preferences section */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-text mb-3">Preferences</h2>
          <SummaryRow label="Session Length" value={`${preferencesData.sessionLength} min`} />
          <SummaryRow label="Study Time" value={preferencesData.studyTime} />
          <SummaryRow label="Break Frequency" value={`Every ${preferencesData.breakFrequency.replace("every-", "")} min`} />
          <SummaryRow label="Priority" value={preferencesData.priority} />
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <PrimaryButton
            variant="secondary"
            onClick={() => navigate("/create/preferences")}
          >
            <ArrowLeft size={16} /> Back
          </PrimaryButton>
          <PrimaryButton onClick={handleCreatePlan} fullWidth>
            <Sparkles size={16} /> Create My Plan
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}