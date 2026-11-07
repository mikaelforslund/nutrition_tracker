"use client";

import { useMemo } from "react";
import { LineChart, macroSeries, singleSeries } from "@/components/progress-chart";
import type { ChartPoint } from "@/lib/nutrition/chart";

export function MobileCharts({
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
  const weightLine = useMemo(() => singleSeries("Weight", weights), [weights]);
  const calorieLine = useMemo(() => singleSeries("Net calories", calories), [calories]);
  const macroLines = useMemo(() => macroSeries(protein, carbs, fat), [protein, carbs, fat]);
  const glassesLine = useMemo(() => singleSeries("Glasses", glasses), [glasses]);

  return (
    <div className="mx-4 mt-2 flex flex-col gap-3 pb-4">
      <div className="rounded-[10px] bg-ios-card p-3">
        <LineChart
          title="Weight"
          unit="kg"
          series={weightLine}
          reference={goalWeightKg}
          referenceLabel="Goal"
          empty="Record your weight on the Today tab to start this chart."
        />
      </div>
      <div className="rounded-[10px] bg-ios-card p-3">
        <LineChart
          title="Net calories"
          unit="kcal"
          series={calorieLine}
          reference={targetCalories}
          referenceLabel="Target"
          empty="Log a meal to start this chart."
        />
      </div>
      <div className="rounded-[10px] bg-ios-card p-3">
        <LineChart
          title="Protein, carbs, and fat"
          unit="g"
          series={macroLines}
          empty="Log a meal to start this chart."
        />
      </div>
      <div className="rounded-[10px] bg-ios-card p-3">
        <LineChart
          title="Glasses per day"
          unit="glasses"
          singularUnit="glass"
          zeroBased
          series={glassesLine}
          reference={targetGlasses}
          referenceLabel="Goal"
          empty="Log a drink on the Today tab to start this chart."
        />
      </div>
      <p className="px-4 text-[13px] text-ios-secondary">
        Tap a chart to see that day. Net calories are eaten minus workouts. Calories, macros, and drinks cover the last 30 days.
      </p>
    </div>
  );
}
