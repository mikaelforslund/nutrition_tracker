import { z } from "zod";

export const WORKOUT_TYPES = [
  "Running",
  "Walking",
  "Cycling",
  "Strength",
  "Swimming",
  "HIIT",
  "Yoga",
  "Rowing",
] as const;

export type Workout = {
  id: string;
  day: string;
  workoutType: string;
  durationMinutes: number;
  caloriesBurned: number;
};

/** Total calories burned on each day. */
export function burnedByDay(workouts: readonly Workout[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const { day, caloriesBurned } of workouts) {
    totals.set(day, (totals.get(day) ?? 0) + caloriesBurned);
  }
  return totals;
}

export const workoutInputSchema = z.object({
  workoutType: z.string().trim().min(1).max(60),
  durationMinutes: z.coerce.number().int().min(1).max(1440),
  caloriesBurned: z.coerce.number().int().min(0).max(10000),
  workedOutOn: z.iso.date(),
});
export type WorkoutInput = z.infer<typeof workoutInputSchema>;

/** The workout form also takes a weight, which can be recorded with no workout at all. */
export function hasNoWorkoutDetails(form: FormData): boolean {
  return ["workoutType", "durationMinutes", "caloriesBurned"].every(
    (field) => !String(form.get(field) ?? "").trim(),
  );
}
