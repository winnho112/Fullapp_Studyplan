/**
 * DashboardPage — Shows existing study plans + "Create New Plan" button
 * Route: /dashboard
 *
 * Each card has Edit / Delete action buttons:
 * - Edit opens a modal to update name, subject, and due date
 * - Delete shows a confirmation dialog before removing the plan
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import StudyPlanCard from "../components/StudyPlanCard";
import InputField from "../components/InputField";
import type { DashboardPlan, AvailabilityData } from "../types";
import { BookOpen, Plus, X, Clock } from "lucide-react";
import { cn } from "../lib/utils";

const DAYS: { key: keyof AvailabilityData; label: string }[] = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const HOUR_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

interface DashboardPageProps {
  dashboardPlans: DashboardPlan[];
  userName: string;
  onEditPlan: (
    planId: string,
    updates: {
      name: string;
      subject: string;
      dueDate: string;
      availability: AvailabilityData;
    }
  ) => void;
  onDeletePlan: (planId: string) => void;
}

export default function DashboardPage({
  dashboardPlans,
  userName,
  onEditPlan,
  onDeletePlan,
}: DashboardPageProps) {
  const navigate = useNavigate();
  const [editingPlan, setEditingPlan] = useState<DashboardPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<DashboardPlan | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editError, setEditError] = useState("");
  const [editAvailability, setEditAvailability] = useState<AvailabilityData>({
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  });
  const todayStr = new Date().toISOString().split("T")[0];

  const totalEditHours = DAYS.reduce(
    (sum, { key }) => sum + Number(editAvailability[key]),
    0
  );

  const openEdit = (plan: DashboardPlan) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditSubject(plan.subject);
    setEditDueDate(plan.dueDate);
    setEditError("");
    setEditAvailability(
      plan.availability ?? {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      }
    );
  };

  const updateEditDay = (day: keyof AvailabilityData, hours: number) => {
    setEditAvailability((prev) => ({ ...prev, [day]: hours }));
  };

  const saveEdit = () => {
    if (!editingPlan) return;
    if (!editName.trim() || !editSubject.trim() || !editDueDate) {
      setEditError("All fields are required");
      return;
    }
    if (editDueDate <= todayStr) {
      setEditError("Due date must be a future date");
      return;
    }
    if (totalEditHours === 0) {
      setEditError("Set at least some study availability");
      return;
    }
    onEditPlan(editingPlan.id, {
      name: editName.trim(),
      subject: editSubject.trim(),
      dueDate: editDueDate,
      availability: editAvailability,
    });
    setEditingPlan(null);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-light">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">
                Hi, {userName || "there"}!
              </h1>
              <p className="text-sm text-text-muted">
                {dashboardPlans.length} active plans
              </p>
            </div>
          </div>
          <PrimaryButton onClick={() => navigate("/create/assignment")}>
            <Plus size={16} /> Create New Plan
          </PrimaryButton>
        </div>

        {/* Plan cards grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {dashboardPlans.map((plan) => (
            <StudyPlanCard
              key={plan.id}
              name={plan.name}
              subject={plan.subject}
              dueDate={plan.dueDate}
              progress={plan.progress}
              daysRemaining={plan.daysRemaining}
              onClick={() => navigate(`/plan/${plan.id}`)}
              onEdit={() => openEdit(plan)}
              onDelete={() => setDeletingPlan(plan)}
            />
          ))}
        </div>

        {/* Empty state encouragement */}
        {dashboardPlans.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted">
              No plans yet. Create your first study plan!
            </p>
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text">Edit Plan</h2>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                aria-label="Close"
                className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <InputField
                label="Assignment Name"
                value={editName}
                onChange={setEditName}
                required
              />
              <InputField
                label="Subject"
                value={editSubject}
                onChange={setEditSubject}
                required
              />
              <InputField
                label="Due Date"
                type="date"
                value={editDueDate}
                onChange={setEditDueDate}
                min={todayStr}
                required
              />

              {/* Study Availability */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text">
                  Study Availability
                </label>
                <div className="flex flex-col gap-1.5">
                  {DAYS.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-border p-2"
                    >
                      <span className="w-10 text-xs font-medium text-text">
                        {label}
                      </span>
                      <div className="flex flex-1 flex-wrap gap-1">
                        {HOUR_OPTIONS.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => updateEditDay(key, h)}
                            className={cn(
                              "rounded-md px-2 py-1 text-xs font-medium transition-all cursor-pointer",
                              editAvailability[key] === h
                                ? "bg-primary text-white"
                                : "bg-gray-100 text-text-muted hover:bg-gray-200"
                            )}
                          >
                            {h === 0 ? "Off" : `${h}h`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary-light p-2.5">
                  <Clock size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    Total: {totalEditHours} hours/week
                  </span>
                </div>
              </div>

              {editError && <p className="text-xs text-danger">{editError}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <PrimaryButton
                variant="secondary"
                onClick={() => setEditingPlan(null)}
                fullWidth
              >
                Cancel
              </PrimaryButton>
              <PrimaryButton onClick={saveEdit} fullWidth>
                Save Changes
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-text mb-2">
              Delete Plan
            </h2>
            <p className="text-sm text-text-muted mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-text">
                {deletingPlan.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <PrimaryButton
                variant="secondary"
                onClick={() => setDeletingPlan(null)}
                fullWidth
              >
                Cancel
              </PrimaryButton>
              <PrimaryButton
                variant="danger"
                onClick={() => {
                  onDeletePlan(deletingPlan.id);
                  setDeletingPlan(null);
                }}
                fullWidth
              >
                Delete
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}