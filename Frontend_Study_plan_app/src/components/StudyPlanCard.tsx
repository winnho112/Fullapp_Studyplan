/**
 * StudyPlanCard — Card displaying a study plan's name, due date,
 * progress bar, and days remaining
 * Used on: DashboardPage (clickable + edit/delete actions), ResultPage (display-only)
 *
 * When `onClick` is provided the card renders as a focusable <button>
 * with full keyboard support (Tab / Enter / Space) and an aria-label
 * for screen readers — making dashboard cards accessible.
 * When `onEdit`/`onDelete` are provided, action buttons appear below
 * the main content area (outside the button to avoid nested buttons).
 */
import { cn } from "../lib/utils";
import { Calendar, Clock, Pencil, Trash2 } from "lucide-react";

interface StudyPlanCardProps {
  name: string;
  subject: string;
  dueDate: string;
  progress: number; // 0-100
  daysRemaining: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function StudyPlanCard({
  name,
  subject,
  dueDate,
  progress,
  daysRemaining,
  onClick,
  onEdit,
  onDelete,
}: StudyPlanCardProps) {
  // Color-code urgency based on days remaining
  const urgencyColor =
    daysRemaining <= 3
      ? "text-danger"
      : daysRemaining <= 7
        ? "text-warning"
        : "text-success";

  const urgencyBg =
    daysRemaining <= 3
      ? "bg-red-50"
      : daysRemaining <= 7
        ? "bg-yellow-50"
        : "bg-green-50";

  const isClickable = !!onClick;
  const hasActions = !!(onEdit || onDelete);

  const formattedDate = new Date(dueDate).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const ariaLabel = `${name}, ${subject}. ${progress}% complete, ${daysRemaining} days remaining. Due ${formattedDate}`;

  const cardContent = (
    <>
      {/* Header: Plan name + days remaining badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-text">{name}</h3>
          <p className="text-sm text-text-muted mt-0.5">{subject}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
            urgencyBg,
            urgencyColor
          )}
        >
          <Clock size={12} />
          {daysRemaining}d left
        </span>
      </div>

      {/* Due date */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted mb-4">
        <Calendar size={12} />
        <span>Due: {formattedDate}</span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress >= 100
                ? "bg-success"
                : progress >= 50
                  ? "bg-primary"
                  : "bg-warning"
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium text-text-muted">
          {progress}%
        </span>
      </div>
    </>
  );

  const cardBase =
    "rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow duration-200";

  // Display-only card (e.g. ResultPage) → plain <div>
  if (!isClickable && !hasActions) {
    return (
      <div className={cn(cardBase, "hover:shadow-md")}>{cardContent}</div>
    );
  }

  // Card with action buttons → <div> wrapper with <button> main area + action bar
  if (hasActions) {
    return (
      <div className={cn(cardBase, "hover:shadow-md flex flex-col")}>
        {isClickable ? (
          <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            className="text-left w-full cursor-pointer focus:outline-none"
          >
            {cardContent}
          </button>
        ) : (
          cardContent
        )}

        {/* Action bar — Edit / Delete */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${name}`}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors",
                "text-primary bg-primary-light hover:bg-primary hover:text-white",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            >
              <Pencil size={13} /> Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${name}`}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors",
                "text-danger bg-red-50 hover:bg-danger hover:text-white",
                "focus:outline-none focus:ring-2 focus:ring-danger"
              )}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  // Clickable card without actions → semantic <button>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        cardBase,
        "text-left w-full",
        "cursor-pointer hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      )}
    >
      {cardContent}
    </button>
  );
}