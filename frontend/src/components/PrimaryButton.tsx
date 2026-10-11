/**
 * PrimaryButton — Reusable CTA button for navigation actions
 * Used on: All 7 screens (Login, Dashboard, Assignment, Availability,
 *          Preferences, Review, Result)
 *
 * Props flow: Pages pass variant/label/onClick as props
 *
 * Primary variant now uses the StardustButton (3D dark-blue pearl effect).
 * Secondary and danger variants remain standard Tailwind-styled buttons.
 */
import { cn } from "../lib/utils";
import { StardustButton } from "./ui/stardust-button";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}

export default function PrimaryButton({
  children,
  onClick,
  variant = "primary",
  fullWidth = false,
  disabled = false,
  type = "button",
}: PrimaryButtonProps) {
  // Primary → 3D StardustButton
  if (variant === "primary") {
    return (
      <StardustButton
        onClick={onClick}
        fullWidth={fullWidth}
        disabled={disabled}
        type={type}
      >
        {children}
      </StardustButton>
    );
  }

  // Secondary / Danger → standard Tailwind buttons
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3",
        "text-sm font-semibold transition-all duration-200",
        "cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "secondary" &&
          "bg-white text-text border border-border hover:bg-gray-50 focus:ring-gray-300",
        variant === "danger" &&
          "bg-danger text-white hover:bg-red-600 focus:ring-danger",
        fullWidth && "w-full"
      )}
    >
      {children}
    </button>
  );
}