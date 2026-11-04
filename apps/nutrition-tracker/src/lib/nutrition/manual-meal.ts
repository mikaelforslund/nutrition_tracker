import { foodLogInputSchema, type FoodLogInput } from "./schemas";

export type ManualMealDraft = {
  foodName: string;
  quantity: number;
  proteinG: string;
  carbsG: string;
  fatG: string;
};

export const EMPTY_MANUAL_MEAL: ManualMealDraft = {
  foodName: "",
  quantity: 1,
  proteinG: "",
  carbsG: "",
  fatG: "",
};

export const QUANTITY_STEP = 0.5;

/** Decimal keypads type a comma in many iPhone regions. */
export function parseDecimal(value: string): number {
  return Number(value.trim().replace(",", "."));
}

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

/**
 * Turns per-serving values into the totals to log, or null if they aren't usable
 * yet. Blank macros count as zero.
 */
export function manualMealToLog(draft: ManualMealDraft): FoodLogInput | null {
  const name = draft.foodName.trim();
  const protein = parseDecimal(draft.proteinG);
  const carbs = parseDecimal(draft.carbsG);
  const fat = parseDecimal(draft.fatG);

  if (!(protein + carbs + fat > 0)) return null;

  const log = foodLogInputSchema.safeParse({
    foodName: draft.quantity === 1 ? name : `${name} × ${draft.quantity}`,
    proteinG: oneDecimal(protein * draft.quantity),
    carbsG: oneDecimal(carbs * draft.quantity),
    fatG: oneDecimal(fat * draft.quantity),
    imageUrl: null,
  });

  return name && log.success ? log.data : null;
}
