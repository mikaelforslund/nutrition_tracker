import { CircleAlert, CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export type StatusTone = "good" | "warning" | "critical";

const STYLES: Record<StatusTone, { icon: LucideIcon; className: string }> = {
  good: { icon: CircleCheck, className: "text-status-good-ink" },
  warning: { icon: TriangleAlert, className: "text-status-warning-ink" },
  critical: { icon: CircleAlert, className: "text-status-critical-ink" },
};

export function StatusLabel({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  const { icon: Icon, className } = STYLES[tone];

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", className)}>
      <Icon aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}
