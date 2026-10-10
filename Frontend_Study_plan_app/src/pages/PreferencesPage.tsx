/**
 * PreferencesPage — Session length, preferred study time,
 * break frequency, priority (all radio groups)
 * Route: /create/preferences
 *
 * Props flow: Receives preferencesData + onPreferencesComplete callback from App
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import type { PreferencesData } from "../types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

interface PreferencesPageProps {
  preferencesData: PreferencesData;
  onPreferencesComplete: (data: PreferencesData) => void;
}

/** Reusable radio card group */
function RadioCards<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-text">{label}</label>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-xl border px-4 py-3 text-sm text-left transition-all cursor-pointer",
              value === opt.value
                ? "border-primary bg-primary-light text-primary font-medium"
                : "border-border bg-white text-text hover:border-gray-300"
            )}
          >
            <span className="block font-medium">{opt.label}</span>
            {opt.description && (
              <span className="block text-xs text-text-muted mt-0.5">
                {opt.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PreferencesPage({
  preferencesData,
  onPreferencesComplete,
}: PreferencesPageProps) {
  const navigate = useNavigate();
  // Local state initialized from App's central state via props
  const [prefs, setPrefs] = useState<PreferencesData>(preferencesData);

  const update = <K extends keyof PreferencesData>(
    key: K,
    value: PreferencesData[K]
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleContinue = () => {
    // Callback up: send preferences to App's central state
    onPreferencesComplete(prefs);
    navigate("/create/review");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Step indicator */}
        <p className="text-xs font-medium text-primary mb-2">Step 3 of 3</p>
        <h1 className="text-2xl font-bold text-text mb-1">
          Study Preferences
        </h1>
        <p className="text-sm text-text-muted mb-6">
          How do you prefer to study? We'll tailor your plan accordingly.
        </p>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex flex-col gap-5">
            <RadioCards
              label="Session Length"
              value={prefs.sessionLength}
              onChange={(v) => update("sessionLength", v)}
              options={[
                { value: "25", label: "25 min", description: "Pomodoro style" },
                { value: "50", label: "50 min", description: "Balanced focus" },
                { value: "90", label: "90 min", description: "Deep work" },
              ]}
            />
            <RadioCards
              label="Preferred Study Time"
              value={prefs.studyTime}
              onChange={(v) => update("studyTime", v)}
              options={[
                { value: "morning", label: "Morning", description: "6am – 12pm" },
                { value: "afternoon", label: "Afternoon", description: "12pm – 6pm" },
                { value: "evening", label: "Evening", description: "6pm – 12am" },
              ]}
            />
            <RadioCards
              label="Break Frequency"
              value={prefs.breakFrequency}
              onChange={(v) => update("breakFrequency", v)}
              options={[
                { value: "every-25", label: "Every 25 min" },
                { value: "every-50", label: "Every 50 min" },
                { value: "every-90", label: "Every 90 min" },
              ]}
            />
            <RadioCards
              label="Priority"
              value={prefs.priority}
              onChange={(v) => update("priority", v)}
              options={[
                { value: "speed", label: "Speed", description: "Get it done fast" },
                { value: "quality", label: "Quality", description: "Best possible work" },
                { value: "balanced", label: "Balanced", description: "Mix of both" },
              ]}
            />
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            <PrimaryButton
              variant="secondary"
              onClick={() => navigate("/create/availability")}
            >
              <ArrowLeft size={16} /> Back
            </PrimaryButton>
            <PrimaryButton onClick={handleContinue} fullWidth>
              Continue <ArrowRight size={16} />
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}