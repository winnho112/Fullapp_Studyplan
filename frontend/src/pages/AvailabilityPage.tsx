/**
 * AvailabilityPage — Per-day hour selectors (Mon–Sun) with live
 * "Total available study time: X hours/week" counter
 * Route: /create/availability
 *
 * KEY INTERACTIVE MOMENT: total hours updates live when any day changes
 *
 * Props flow: Receives availabilityData + onAvailabilityComplete callback from App
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import type { AvailabilityData } from "../types";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { cn } from "../lib/utils";

interface AvailabilityPageProps {
  availabilityData: AvailabilityData;
  onAvailabilityComplete: (data: AvailabilityData) => void;
}

const DAYS: { key: keyof AvailabilityData; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const HOUR_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

export default function AvailabilityPage({
  availabilityData,
  onAvailabilityComplete,
}: AvailabilityPageProps) {
  const navigate = useNavigate();
  // Local state initialized from App's central state via props
  const [availability, setAvailability] =
    useState<AvailabilityData>(availabilityData);

  // Live-updating total — this is the KEY interactive moment
  const totalHours = Object.values(availability).reduce(
    (sum, h) => sum + h,
    0
  );

  const updateDay = (day: keyof AvailabilityData, hours: number) => {
    setAvailability((prev) => ({ ...prev, [day]: hours }));
  };

  const handleContinue = () => {
    // Callback up: send availability to App's central state
    onAvailabilityComplete(availability);
    navigate("/create/preferences");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Step indicator */}
        <p className="text-xs font-medium text-primary mb-2">Step 2 of 3</p>
        <h1 className="text-2xl font-bold text-text mb-1">
          Study Availability
        </h1>
        <p className="text-sm text-text-muted mb-6">
          How many hours can you study each day this week?
        </p>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          {/* Day-by-day hour selectors */}
          <div className="flex flex-col gap-3">
            {DAYS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <span className="w-20 text-sm font-medium text-text">
                  {label}
                </span>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {HOUR_OPTIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateDay(key, h)}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer",
                        availability[key] === h
                          ? "bg-primary text-white shadow-sm"
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

          {/* Live total counter — the key interactive feature */}
          <div
            className={cn(
              "mt-5 flex items-center justify-center gap-2 rounded-xl p-4 transition-all duration-300",
              totalHours > 0
                ? "bg-primary-light border border-primary/20"
                : "bg-gray-50 border border-border"
            )}
          >
            <Clock
              size={18}
              className={totalHours > 0 ? "text-primary" : "text-text-muted"}
            />
            <span
              className={cn(
                "text-sm font-semibold",
                totalHours > 0 ? "text-primary" : "text-text-muted"
              )}
            >
              Total available study time:{" "}
              <span className="text-lg">{totalHours}</span> hours/week
            </span>
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            <PrimaryButton
              variant="secondary"
              onClick={() => navigate("/create/assignment")}
            >
              <ArrowLeft size={16} /> Back
            </PrimaryButton>
            <PrimaryButton
              onClick={handleContinue}
              fullWidth
              disabled={totalHours === 0}
            >
              Continue <ArrowRight size={16} />
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}