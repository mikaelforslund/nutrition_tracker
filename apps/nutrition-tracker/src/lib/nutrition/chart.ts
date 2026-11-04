export type ChartPoint = { day: string; value: number };

export type ChartSize = {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type PlottedPoint = ChartPoint & { x: number; y: number };

export type ChartSeries = { points: PlottedPoint[]; path: string };

export type Chart = {
  series: ChartSeries[];
  ticks: { value: number; y: number }[];
  referenceY: number | null;
};

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** Picks a round step so the axis shows about four labels and small changes stay visible. */
function niceStep(range: number): number {
  const rough = range / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Works out chart geometry on one shared scale. Each series must be sorted oldest first. */
export function buildChart(
  data: readonly (readonly ChartPoint[])[],
  reference: number | null,
  size: ChartSize,
): Chart | null {
  const all = data.flat();
  if (all.length === 0) return null;

  const values = all.map((point) => point.value);
  if (reference !== null) values.push(reference);

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const step = niceStep(Math.max(rawMax - rawMin, Math.abs(rawMax) * 0.02, 0.5));
  const min = Math.floor(rawMin / step) * step;
  const max = Math.max(Math.ceil(rawMax / step) * step, min + step);

  const plotWidth = size.width - size.left - size.right;
  const plotHeight = size.height - size.top - size.bottom;
  const days = all.map((point) => dayNumber(point.day));
  const first = Math.min(...days);
  const span = Math.max(...days) - first;

  const x = (day: string) =>
    span === 0 ? size.left + plotWidth / 2 : size.left + ((dayNumber(day) - first) / span) * plotWidth;
  const y = (value: number) => size.top + (1 - (value - min) / (max - min)) * plotHeight;

  const series = data.map((points) => {
    const plotted = points.map((point) => ({ ...point, x: x(point.day), y: y(point.value) }));
    return {
      points: plotted,
      path: plotted.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" "),
    };
  });

  const ticks = [];
  for (let value = min; value <= max + step / 2; value += step) {
    ticks.push({ value: Math.round(value * 100) / 100, y: y(value) });
  }

  return { series, ticks, referenceY: reference === null ? null : y(reference) };
}

/** The plotted point closest to a horizontal position. */
export function nearestPoint(points: readonly PlottedPoint[], x: number): PlottedPoint | null {
  let nearest: PlottedPoint | null = null;
  for (const point of points) {
    if (!nearest || Math.abs(point.x - x) < Math.abs(nearest.x - x)) nearest = point;
  }
  return nearest;
}
