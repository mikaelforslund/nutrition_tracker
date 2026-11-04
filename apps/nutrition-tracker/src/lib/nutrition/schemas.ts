import { z } from "zod";

const macroGrams = z.number().min(0).max(2000);

export const foodLogInputSchema = z.object({
  foodName: z.string().trim().min(1).max(200),
  proteinG: macroGrams,
  carbsG: macroGrams,
  fatG: macroGrams,
  imageUrl: z.string().max(2048).nullable(),
});
export type FoodLogInput = z.infer<typeof foodLogInputSchema>;

export const foodLogUpdateSchema = z.object({
  foodName: z.string().trim().min(1).max(200),
  proteinG: z.coerce.number().min(0).max(2000),
  carbsG: z.coerce.number().min(0).max(2000),
  fatG: z.coerce.number().min(0).max(2000),
  loggedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/),
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => value || null),
});
export type FoodLogUpdate = z.infer<typeof foodLogUpdateSchema>;

export const weightSchema = z.number().min(20).max(500);

function optionalNumber<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === null ? null : Number(value)),
    schema.nullable(),
  );
}

const requiredInt = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const profileInputSchema = z.object({
  targetCalories: requiredInt(800, 10000),
  targetProteinG: requiredInt(0, 1000),
  targetCarbsG: requiredInt(0, 2000),
  targetFatG: requiredInt(0, 1000),
  currentWeightKg: optionalNumber(z.number().min(20).max(500)),
  goalWeightKg: optionalNumber(z.number().min(20).max(500)),
  timezone: z.string().min(1).max(100),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;
