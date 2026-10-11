import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import InputField from "../components/InputField";
import type { AssignmentData } from "../types";
import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  assignmentData: AssignmentData;
  onAssignmentComplete: (data: AssignmentData) => void;
}

function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; desc?: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-text">{label}</label>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-xl border px-4 py-3 text-sm text-left transition-all cursor-pointer",
              value === o.value
                ? "border-primary bg-primary-light text-primary font-medium"
                : "border-border bg-white text-text hover:border-gray-300"
            )}
          >
            <span className="block font-medium">{o.label}</span>
            {o.desc && (
              <span className="block text-xs text-text-muted mt-0.5">
                {o.desc}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AssignmentDetailsPage({
  assignmentData,
  onAssignmentComplete,
}: Props) {
  const nav = useNavigate();
  const [f, setF] = useState<AssignmentData>(assignmentData);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const upd = <K extends keyof AssignmentData>(
    k: K,
    v: AssignmentData[K]
  ) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errs[k]) {
      setErrs((p) => {
        const n = { ...p };
        delete n[k];
        return n;
      });
    }
  };

  const todayStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Assignment name is required";
    if (!f.subject.trim()) e.subject = "Subject is required";
    if (!f.dueDate) {
      e.dueDate = "Due date is required";
    } else if (f.dueDate <= todayStr) {
      e.dueDate = "Due date must be a future date";
    }
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <p className="text-xs font-medium text-primary mb-2">Step 1 of 3</p>
        <h1 className="text-2xl font-bold text-text mb-1">
          Assignment Details
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Tell us about your assignment so we can plan your study schedule.
        </p>
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex flex-col gap-5">
            <InputField
              label="Assignment Name"
              value={f.name}
              onChange={(v) => upd("name", v)}
              placeholder="e.g., Research Essay on Climate Change"
              error={errs.name}
              required
            />
            <InputField
              label="Subject"
              value={f.subject}
              onChange={(v) => upd("subject", v)}
              placeholder="e.g., Environmental Science"
              error={errs.subject}
              required
            />
            <InputField
              label="Due Date"
              type="date"
              value={f.dueDate}
              onChange={(v) => upd("dueDate", v)}
              error={errs.dueDate}
              min={todayStr}
              required
            />
            <RadioGroup
              label="Assignment Type"
              value={f.type}
              onChange={(v) => upd("type", v)}
              options={[
                { value: "essay", label: "Essay" },
                { value: "report", label: "Report" },
                { value: "presentation", label: "Presentation" },
                { value: "exam-prep", label: "Exam Prep" },
                { value: "project", label: "Project" },
              ]}
            />
            <RadioGroup
              label="Workload"
              value={f.workload}
              onChange={(v) => upd("workload", v)}
              options={[
                { value: "light", label: "Light", desc: "1-2 days" },
                { value: "moderate", label: "Moderate", desc: "3-5 days" },
                { value: "heavy", label: "Heavy", desc: "1+ week" },
              ]}
            />
          </div>
          <div className="flex gap-3 mt-6">
            <PrimaryButton
              variant="secondary"
              onClick={() => nav("/dashboard")}
            >
              Back
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                if (validate()) {
                  onAssignmentComplete(f);
                  nav("/create/availability");
                }
              }}
              fullWidth
            >
              Continue <ArrowRight size={16} />
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}