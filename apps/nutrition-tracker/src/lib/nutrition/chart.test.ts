import { describe, expect, it } from "vitest";
import { buildChart, nearestPoint } from "./chart";

const size = { width: 400, height: 120, left: 30, right: 10, top: 10, bottom: 20 };
const data = [
  { day: "2026-03-01", value: 88 },
  { day: "2026-03-02", value: 87.5 },
  { day: "2026-03-11", value: 86 },
];

describe("buildChart", () => {
  it("returns nothing without data", () => {
    expect(buildChart([], 80, size)).toBeNull();
    expect(buildChart([[]], 80, size)).toBeNull();
  });

  it("spaces points by real time, so gaps in logging stay visible", () => {
    const chart = buildChart([data], null, size)!;
    const [first, second, third] = chart.series[0]!.points;
    expect(first!.x).toBe(30);
    expect(third!.x).toBe(390);
    expect(second!.x).toBeCloseTo(66);
  });

  it("starts the axis at zero for counts, with whole-number labels", () => {
    const glasses = [
      { day: "2026-03-01", value: 7 },
      { day: "2026-03-02", value: 9 },
    ];
    const chart = buildChart([glasses], 8, size, true)!;
    expect(chart.ticks[0]!.value).toBe(0);
    expect(chart.ticks.every((tick) => Number.isInteger(tick.value))).toBe(true);
  });

  it("keeps every point and the reference inside the plot", () => {
    const chart = buildChart([data], 78, size)!;
    for (const y of [...chart.series[0]!.points.map((p) => p.y), chart.referenceY!]) {
      expect(y).toBeGreaterThanOrEqual(10);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it("draws higher values higher up", () => {
    const { points } = buildChart([data], null, size)!.series[0]!;
    expect(points[0]!.y).toBeLessThan(points[2]!.y);
  });

  it("centres a single point", () => {
    const chart = buildChart([[data[0]!]], null, size)!;
    expect(chart.series[0]!.points[0]!.x).toBe(210);
  });

  it("handles a flat line", () => {
    const flat = data.map((point) => ({ ...point, value: 80 }));
    const chart = buildChart([flat], null, size)!;
    expect(chart.series[0]!.points.every((point) => Number.isFinite(point.y))).toBe(true);
    expect(chart.ticks.length).toBeGreaterThanOrEqual(2);
  });

  it("fits the axis closely, so small weight changes are visible", () => {
    const chart = buildChart([data], 78, size)!;
    const values = chart.ticks.map((tick) => tick.value);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(75);
    expect(Math.max(...values)).toBeLessThanOrEqual(90);
  });

  it("puts several series on one shared scale", () => {
    const low = data.map((point) => ({ ...point, value: point.value / 2 }));
    const { series } = buildChart([data, low], null, size)!;
    expect(series).toHaveLength(2);
    expect(series[1]!.points[0]!.y).toBeGreaterThan(series[0]!.points[0]!.y);
    expect(series[1]!.points[0]!.x).toBe(series[0]!.points[0]!.x);
  });

  it("uses round tick values", () => {
    const chart = buildChart([[{ day: "2026-03-01", value: 1612 }, { day: "2026-03-02", value: 2387 }]], 2100, size)!;
    for (const tick of chart.ticks) expect(tick.value % 100).toBe(0);
  });
});

describe("nearestPoint", () => {
  it("finds the closest point", () => {
    const { points } = buildChart([data], null, size)!.series[0]!;
    expect(nearestPoint(points, 70)?.day).toBe("2026-03-02");
    expect(nearestPoint(points, 380)?.day).toBe("2026-03-11");
  });
});
