export type MealRow = {
  id: string;
  day: string;
  imageUrl: string | null;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string | null;
  loggedAt: Date;
  /** Local time in the user's timezone, in datetime-local input format. */
  loggedAtLocal: string;
};

export type DayGroup = {
  day: string;
  label: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Calories burned in workouts that day. */
  burned: number;
  /** How close the day's net calories (eaten minus burned) came to the target, from 25 to 100. */
  goalScore: number;
  meals: (Omit<MealRow, "day" | "loggedAt"> & { time: string })[];
};

const MIN_GOAL_SCORE = 25;

/** Eating over the target costs the same as eating under it. */
export function goalScore(calories: number, targetCalories: number): number {
  const closeness = 1 - Math.abs(calories - targetCalories) / targetCalories;
  return Math.max(MIN_GOAL_SCORE, Math.round(closeness * 100));
}

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

function previousDay(date: string): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() - 1);
  return result.toISOString().slice(0, 10);
}

function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === previousDay(today)) return "Yesterday";

  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Groups meals by local day. Expects meals newest first, and keeps that order. */
export function groupLogsByDay(
  logs: readonly MealRow[],
  today: string,
  timeZone: string,
  targetCalories: number,
  burned: ReadonlyMap<string, number> = new Map(),
): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const { day, loggedAt, ...meal } of logs) {
    let group = groups.get(day);
    if (!group) {
      group = {
        day,
        label: dayLabel(day, today),
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        burned: burned.get(day) ?? 0,
        goalScore: MIN_GOAL_SCORE,
        meals: [],
      };
      groups.set(day, group);
    }

    group.calories += meal.calories;
    group.goalScore = goalScore(group.calories - group.burned, targetCalories);
    group.proteinG = oneDecimal(group.proteinG + meal.proteinG);
    group.carbsG = oneDecimal(group.carbsG + meal.carbsG);
    group.fatG = oneDecimal(group.fatG + meal.fatG);
    group.meals.push({
      ...meal,
      time: loggedAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone,
      }),
    });
  }

  return [...groups.values()];
}
