import { MAINTENANCE_KCAL_PER_KG } from "./projection";

const DAILY_DEFICIT_KCAL = 500;
const DAILY_SURPLUS_KCAL = 300;
/** Never recommends an intake below this, however large the goal. */
const MIN_DAILY_KCAL = 1200;
const PROTEIN_G_PER_KG = 1.8;
const FAT_SHARE_OF_CALORIES = 0.25;
const WEIGHT_TOLERANCE_KG = 0.1;

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 500;

const nearest = (value: number, step: number) => Math.round(value / step) * step;

export type DailyTargets = {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
};

const isWeight = (value: number) => value >= MIN_WEIGHT_KG && value <= MAX_WEIGHT_KG;

/** Recommends daily targets for reaching a goal weight, or null if a weight isn't usable. */
export function recommendTargets(currentWeightKg: number, goalWeightKg: number): DailyTargets | null {
  if (!isWeight(currentWeightKg) || !isWeight(goalWeightKg)) return null;

  const maintenance = currentWeightKg * MAINTENANCE_KCAL_PER_KG;
  const change = goalWeightKg - currentWeightKg;

  const adjusted =
    Math.abs(change) < WEIGHT_TOLERANCE_KG
      ? maintenance
      : change < 0
        ? maintenance - DAILY_DEFICIT_KCAL
        : maintenance + DAILY_SURPLUS_KCAL;

  const targetCalories = nearest(Math.max(adjusted, MIN_DAILY_KCAL), 10);
  const targetProteinG = nearest(goalWeightKg * PROTEIN_G_PER_KG, 5);
  const targetFatG = nearest((targetCalories * FAT_SHARE_OF_CALORIES) / 9, 5);
  const carbCalories = targetCalories - targetProteinG * 4 - targetFatG * 9;

  return {
    targetCalories,
    targetProteinG,
    targetFatG,
    targetCarbsG: Math.max(nearest(carbCalories / 4, 5), 0),
  };
}
