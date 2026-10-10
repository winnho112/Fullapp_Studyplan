/**
 * InputField — Reusable labelled text input with optional error state
 * Used on: LoginPage, AssignmentDetailsPage
 *
 * Props flow: Pages pass value, onChange callback, label, and optional error
 */
import { cn } from "../lib/utils";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "date";
  placeholder?: string;
  error?: string;
  required?: boolean;
  min?: string; // for date inputs — minimum selectable date
}

export default function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required = false,
  min,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        className={cn(
          "w-full rounded-xl border px-4 py-3 text-sm",
          "bg-white text-text placeholder:text-text-muted",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          error
            ? "border-danger focus:ring-danger"
            : "border-border focus:border-primary focus:ring-primary"
        )}
      />
      {error && (
        <p className="text-xs text-danger mt-0.5">{error}</p>
      )}
    </div>
  );
}