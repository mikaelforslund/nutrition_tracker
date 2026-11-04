import type { ReactNode } from "react";
import { StatusLabel, type StatusTone } from "./badge";
import { Card, CardContent } from "./card";
import { ProgressBar, type ProgressTone } from "./progress-bar";

export type KpiCardProps = {
  label: string;
  value: string;
  unit?: string;
  caption?: ReactNode;
  status?: { tone: StatusTone; label: string };
  progress?: { value: number; max: number; tone?: ProgressTone };
};

export function KpiCard({ label, value, unit, caption, status, progress }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-1.5 p-3.5">
        <div className="flex min-h-5 items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          {status ? <StatusLabel tone={status.tone}>{status.label}</StatusLabel> : null}
        </div>
        <p className="text-2xl font-semibold tracking-tight text-zinc-950">
          {value}
          {unit ? <span className="ml-1 text-sm font-medium text-zinc-500">{unit}</span> : null}
        </p>
        {progress ? (
          <ProgressBar
            label={label}
            value={progress.value}
            max={progress.max}
            tone={progress.tone}
          />
        ) : null}
        {caption ? <p className="text-xs text-zinc-500">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}
