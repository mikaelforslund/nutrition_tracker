const SIZE = 132;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const ratio = Math.min(Math.max(eaten / target, 0), 1);
  const remaining = target - eaten;
  const over = remaining < 0;
  const color = over ? "var(--color-ios-orange)" : "var(--color-ios-green)";

  return (
    <div
      role="img"
      aria-label={`${Math.round(eaten)} of ${target} net calories`}
      className="relative size-33 shrink-0"
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeOpacity={0.18}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] leading-none font-bold tracking-tight">
          {Math.abs(Math.round(remaining)).toLocaleString("en-US")}
        </span>
        <span className="text-[12px] text-ios-secondary">{over ? "kcal over" : "kcal left"}</span>
      </div>
    </div>
  );
}

export function MacroBar({ label, eaten, target }: { label: string; eaten: number; target: number }) {
  const ratio = target > 0 ? Math.min(eaten / target, 1) : 0;

  return (
    <div>
      <div className="flex justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="text-ios-secondary">
          {Math.round(eaten)} / {target} g
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ios-fill">
        <div
          className="h-full rounded-full bg-ios-blue transition-[width] duration-700"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
