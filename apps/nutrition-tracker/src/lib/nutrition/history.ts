import type { DayGroup } from "./group-logs";
import type { Workout } from "./workouts";

export type HistoryDay = {
  day: string;
  meals: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  burned: number;
  goalScore: number | null;
};

export type HistoryMonth = {
  /** As YYYY-MM. */
  month: string;
  days: HistoryDay[];
  /** The next older month with anything logged, if there is one. */
  earlierMonth: string | null;
};

export type HistoryDayDetail = {
  meals: DayGroup["meals"];
  workouts: Workout[];
};

const utcDate = (value: string) => new Date(`${value}T00:00:00Z`);

export const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export function monthLabel(month: string): string {
  return utcDate(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shortDayLabel(day: string): string {
  const date = utcDate(day);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${weekday} ${date.getUTCDate()}`;
}

/** Average calories across days with meals, since other days have no intake to average. */
export function monthSummary(days: readonly HistoryDay[]): { logged: number; averageCalories: number | null } {
  const logged = days.filter((day) => day.meals > 0);
  if (logged.length === 0) return { logged: 0, averageCalories: null };

  const total = logged.reduce((sum, day) => sum + day.calories, 0);
  return { logged: logged.length, averageCalories: Math.round(total / logged.length) };
}
