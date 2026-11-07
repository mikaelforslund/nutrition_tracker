"use client";

import { cn } from "@trackerx/ui";
import { ChevronRight } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";
import { buildChart, nearestPoint, type ChartPoint } from "@/lib/nutrition/chart";

const HEIGHT = 150;
const MARGIN = { left: 38, right: 14, top: 10, bottom: 20 };
const END_LABEL_MARGIN = 54;
const MIN_LABEL_GAP = 11;

const LINE_COLOR = "var(--chart-line)";
/** Validated categorical slots, in their fixed order. Dark values are set in globals.css. */
const MACRO_COLORS = {
  protein: "var(--chart-series-1)",
  carbs: "var(--chart-series-2)",
  fat: "var(--chart-series-3)",
};

const COLLAPSED_KEY = "trackerx.progress-collapsed";
const COLLAPSE_EVENT = "trackerx:progress-collapse";

const shortDate = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

type Series = { label: string; color: string; data: ChartPoint[] };

export const singleSeries = (label: string, data: ChartPoint[]): Series[] => [
  { label, color: LINE_COLOR, data },
];

export const macroSeries = (
  protein: ChartPoint[],
  carbs: ChartPoint[],
  fat: ChartPoint[],
): Series[] => [
  { label: "Protein", color: MACRO_COLORS.protein, data: protein },
  { label: "Carbs", color: MACRO_COLORS.carbs, data: carbs },
  { label: "Fat", color: MACRO_COLORS.fat, data: fat },
];

function useElementWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

export function LineChart({
  title,
  unit,
  series,
  reference = null,
  referenceLabel,
  empty,
  singularUnit = unit,
  zeroBased = false,
}: {
  title: string;
  unit: string;
  /** Shown instead of the unit for a value of exactly 1. */
  singularUnit?: string;
  /** Starts the axis at zero, for counts. */
  zeroBased?: boolean;
  series: Series[];
  reference?: number | null;
  referenceLabel?: string;
  empty: string;
}) {
  const [ref, measured] = useElementWidth();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const width = measured;
  const multi = series.length > 1;

  const size = useMemo(
    () => ({
      width,
      height: HEIGHT,
      ...MARGIN,
      right: multi ? END_LABEL_MARGIN : MARGIN.right,
    }),
    [width, multi],
  );

  const chart = useMemo(
    () =>
      buildChart(
        series.map((item) => item.data),
        reference,
        size,
        zeroBased,
      ),
    [series, reference, size, zeroBased],
  );

  const format = (value: number) => `${value.toLocaleString("en-US")} ${value === 1 ? singularUnit : unit}`;

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setHoverX(((event.clientX - box.left) / box.width) * size.width);
  }

  const firstSeries = chart?.series[0]?.points ?? [];
  const hovered = hoverX === null ? null : nearestPoint(firstSeries, hoverX);
  const hoveredRows = hovered
    ? series.flatMap((item, index) => {
        const point = chart?.series[index]?.points.find(({ day }) => day === hovered.day);
        return point ? [{ ...item, point }] : [];
      })
    : [];

  // Sparing end labels: anything that would collide is left to the legend and tooltip.
  const endLabels: { label: string; y: number }[] = [];
  if (multi && chart) {
    const ends = series.flatMap((item, index) => {
      const last = chart.series[index]?.points.at(-1);
      return last ? [{ label: item.label, y: last.y }] : [];
    });
    for (const end of ends.sort((a, b) => a.y - b.y)) {
      if (endLabels.every((placed) => Math.abs(placed.y - end.y) >= MIN_LABEL_GAP)) {
        endLabels.push(end);
      }
    }
  }

  const first = firstSeries[0];
  const last = firstSeries[firstSeries.length - 1];

  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 flex flex-wrap items-center justify-between gap-x-3 text-xs">
        <span className="font-medium text-(--chart-ink)">{title}</span>
        {multi ? (
          <span className="flex items-center gap-3 text-(--chart-label)">
            {series.map((item) => (
              <span key={item.label} className="flex items-center gap-1">
                <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </span>
        ) : null}
      </figcaption>

      <div ref={ref} className="relative">
        {measured === 0 ? (
          // Holds the space until the real width is known, so nothing jumps.
          <div style={{ height: HEIGHT }} />
        ) : chart && first && last ? (
          <svg
            role="img"
            aria-label={`${title} from ${shortDate(first.day)} to ${shortDate(last.day)}, latest ${series
              .map((item) => `${multi ? `${item.label} ` : ""}${format(item.data.at(-1)?.value ?? 0)}`)
              .join(", ")}`}
            width={size.width}
            height={HEIGHT}
            className="block touch-pan-y"
            onPointerMove={handleMove}
            onPointerDown={handleMove}
            onPointerLeave={(event) => {
              // On touch the value stays up after a tap, until the next one.
              if (event.pointerType === "mouse") setHoverX(null);
            }}
          >
            {chart.ticks.map((tick) => (
              <g key={tick.value}>
                <line x1={size.left} x2={size.width - size.right} y1={tick.y} y2={tick.y} className="stroke-(--chart-grid)" />
                <text x={size.left - 6} y={tick.y + 3} textAnchor="end" className="fill-(--chart-label) text-[10px]">
                  {tick.value.toLocaleString("en-US")}
                </text>
              </g>
            ))}

            {chart.referenceY !== null && reference !== null ? (
              <g>
                <line
                  x1={size.left}
                  x2={size.width - size.right}
                  y1={chart.referenceY}
                  y2={chart.referenceY}
                  strokeDasharray="4 3"
                  className="stroke-(--chart-rule)"
                />
              </g>
            ) : null}

            {chart.series.map((line, index) => {
              const color = series[index]?.color ?? LINE_COLOR;
              return (
                <g key={series[index]?.label}>
                  <path d={line.path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {line.points.map((point) => (
                    <circle key={point.day} cx={point.x} cy={point.y} r={2.5} fill={color} />
                  ))}
                </g>
              );
            })}

            {/* Drawn after the lines, with an outline, so it stays readable where one crosses it. */}
            {chart.referenceY !== null && reference !== null ? (
              <text
                x={size.width - size.right}
                y={chart.referenceY - 3}
                textAnchor="end"
                paintOrder="stroke"
                strokeWidth={3}
                className="fill-(--chart-label) stroke-(--chart-surface) text-[10px]"
              >
                {referenceLabel} {format(reference)}
              </text>
            ) : null}

            {endLabels.map((end) => (
              <text key={end.label} x={size.width - size.right + 6} y={end.y + 3} className="fill-(--chart-label) text-[10px]">
                {end.label}
              </text>
            ))}

            {hovered ? (
              <g>
                <line x1={hovered.x} x2={hovered.x} y1={size.top} y2={HEIGHT - size.bottom} className="stroke-(--chart-rule)" />
                {hoveredRows.map(({ label, color, point }) => (
                  <circle key={label} cx={point.x} cy={point.y} r={4.5} fill={color} strokeWidth={2} className="stroke-(--chart-surface)" />
                ))}
              </g>
            ) : null}

            <text x={size.left} y={HEIGHT - 5} className="fill-(--chart-label) text-[10px]">
              {shortDate(first.day)}
            </text>
            {firstSeries.length > 1 ? (
              <text x={size.width - size.right} y={HEIGHT - 5} textAnchor="end" className="fill-(--chart-label) text-[10px]">
                {shortDate(last.day)}
              </text>
            ) : null}
          </svg>
        ) : (
          <p className="flex items-center justify-center text-center text-xs text-(--chart-label)" style={{ height: HEIGHT }}>
            {empty}
          </p>
        )}

        {hovered ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-(--chart-grid) bg-(--chart-surface) px-2 py-1 text-xs whitespace-nowrap shadow-sm"
            style={{ left: `${Math.min(Math.max((hovered.x / size.width) * 100, 18), 82)}%` }}
          >
            <p className="text-(--chart-label)">{shortDate(hovered.day)}</p>
            {hoveredRows.map(({ label, color, point }) => (
              <p key={label} className="flex items-center gap-1.5">
                {multi ? (
                  <>
                    <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-(--chart-label)">{label}</span>
                  </>
                ) : null}
                <span className="ml-auto pl-2 font-medium text-(--chart-ink)">{format(point.value)}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </figure>
  );
}

function subscribeToCollapse(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(COLLAPSE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COLLAPSE_EVENT, onChange);
  };
}

/** Remembered in the browser, so the panel stays how it was left. */
function useCollapsed() {
  const collapsed = useSyncExternalStore(
    subscribeToCollapse,
    () => localStorage.getItem(COLLAPSED_KEY) === "true",
    () => false,
  );

  function toggle() {
    localStorage.setItem(COLLAPSED_KEY, String(!collapsed));
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }

  return [collapsed, toggle] as const;
}

export function ProgressChart({
  weights,
  calories,
  protein,
  carbs,
  fat,
  glasses,
  targetGlasses,
  goalWeightKg,
  targetCalories,
}: {
  weights: ChartPoint[];
  calories: ChartPoint[];
  protein: ChartPoint[];
  carbs: ChartPoint[];
  fat: ChartPoint[];
  glasses: ChartPoint[];
  targetGlasses: number;
  goalWeightKg: number | null;
  targetCalories: number;
}) {
  const [collapsed, toggleCollapsed] = useCollapsed();
  const [view, setView] = useState<"weight" | "calories" | "drinks">("weight");

  const weightSeries = useMemo(() => singleSeries("Weight", weights), [weights]);
  const calorieSeries = useMemo(() => singleSeries("Net calories", calories), [calories]);
  const macroLines = useMemo(() => macroSeries(protein, carbs, fat), [protein, carbs, fat]);
  const glassesLine = useMemo(() => singleSeries("Glasses", glasses), [glasses]);

  return (
    <section aria-label="Progress" className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={toggleCollapsed}
            className="flex items-center gap-1 rounded-md py-1 pr-1 text-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ChevronRight
              aria-hidden
              className={cn("size-4 text-zinc-400 transition-transform", !collapsed && "rotate-90")}
            />
            Progress
          </button>
          {collapsed ? null : (
            <div role="group" aria-label="Chart" className="flex rounded-lg bg-zinc-100 p-0.5">
              {(["weight", "calories", "drinks"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize focus-visible:outline-2 focus-visible:outline-accent",
                    view === option ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-900",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {collapsed ? null : (
        <div className="mt-2">
          {view === "weight" ? (
            <LineChart
              title="Weight"
              unit="kg"
              series={weightSeries}
              reference={goalWeightKg}
              referenceLabel="Goal"
              empty="Use Add workout on the Workouts tab to record your weight."
            />
          ) : view === "drinks" ? (
            <LineChart
              title="Glasses per day"
              unit="glasses"
              singularUnit="glass"
              zeroBased
              series={glassesLine}
              reference={targetGlasses}
              referenceLabel="Goal"
              empty="Log a drink to start the chart."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <LineChart
                title="Net calories"
                unit="kcal"
                series={calorieSeries}
                reference={targetCalories}
                referenceLabel="Target"
                empty="Log a meal to start the chart."
              />
              <LineChart
                title="Protein, carbs, and fat"
                unit="g"
                series={macroLines}
                empty="Log a meal to start the chart."
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
