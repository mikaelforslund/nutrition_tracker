import { cn } from "./cn";

export type ProgressTone = "default" | "warning" | "critical";

export type ProgressBarProps = {
  value: number;
  max: number;
  label: string;
  tone?: ProgressTone;
  className?: string;
};

const FILL: Record<ProgressTone, string> = {
  default: "bg-accent",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
};

const TRACK: Record<ProgressTone, string> = {
  default: "bg-accent-track",
  warning: "bg-status-warning-track",
  critical: "bg-status-critical-track",
};

export function ProgressBar({ value, max, label, tone = "default", className }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(Math.max(value, 0), max)}
      className={cn("h-2 w-full overflow-hidden rounded-full", TRACK[tone], className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", FILL[tone])}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
