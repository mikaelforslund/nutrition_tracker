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
  goalWeightKg,
  targetCalories,
}: {
  weights: ChartPoint[];
  calories: ChartPoint[];
  protein: ChartPoint[];
  carbs: ChartPoint[];
  fat: ChartPoint[];
  goalWeightKg: number | null;
  targetCalories: number;
}) {
  const weightLine = useMemo(() => singleSeries("Weight", weights), [weights]);
  const calorieLine = useMemo(() => singleSeries("Calories", calories), [calories]);
  const macroLines = useMemo(() => macroSeries(protein, carbs, fat), [protein, carbs, fat]);

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
          title="Calories"
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
      <p className="px-4 text-[13px] text-ios-secondary">
        Tap a chart to see that day. Calories and macros cover the last 30 days.
      </p>
    </div>
  );
}
