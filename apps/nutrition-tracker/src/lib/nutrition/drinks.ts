import { z } from "zod";
import type { ChartPoint } from "./chart";

export const DRINK_TYPES = ["water", "coffee", "tea", "other"] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

export const DRINK_LABELS: Record<DrinkType, string> = {
  water: "Water",
  coffee: "Coffee",
  tea: "Tea",
  other: "Other",
};

export const MAX_GLASSES = 50;
/** Days always listed for editing, even with nothing logged. */
const EDITABLE_DAYS = 7;

export type DrinkLog = { day: string; drinkType: DrinkType; glasses: number };

export type DrinkDay = { day: string; total: number } & Record<DrinkType, number>;

const emptyDay = (day: string): DrinkDay => ({ day, total: 0, water: 0, coffee: 0, tea: 0, other: 0 });

const previousDay = (day: string, daysBack: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - daysBack * 86_400_000).toISOString().slice(0, 10);

/** Glasses per drink on each logged day, newest first. */
export function drinkDays(logs: readonly DrinkLog[]): DrinkDay[] {
  const days = new Map<string, DrinkDay>();
  for (const { day, drinkType, glasses } of logs) {
    const entry = days.get(day) ?? emptyDay(day);
    entry[drinkType] += glasses;
    entry.total += glasses;
    days.set(day, entry);
  }
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
}

/** The past week plus any older logged days, newest first, so a missed day can be filled in. */
export function editableDrinkDays(logs: readonly DrinkLog[], today: string): DrinkDay[] {
  const logged = drinkDays(logs);
  const days = new Map(logged.map((entry) => [entry.day, entry]));
  for (let back = 0; back < EDITABLE_DAYS; back += 1) {
    const day = previousDay(today, back);
    if (!days.has(day)) days.set(day, emptyDay(day));
  }
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
}

/** Daily totals for the chart, oldest first. */
export function glassesSeries(logs: readonly DrinkLog[]): ChartPoint[] {
  return drinkDays(logs)
    .map(({ day, total }) => ({ day, value: total }))
    .reverse();
}

/** The drinks on one day, such as "2 water, 1 coffee". */
export function drinkSummary(day: DrinkDay): string {
  return DRINK_TYPES.filter((type) => day[type] > 0)
    .map((type) => `${day[type]} ${DRINK_LABELS[type].toLowerCase()}`)
    .join(", ");
}

export const glassesLabel = (glasses: number) => `${glasses} ${glasses === 1 ? "glass" : "glasses"}`;

export const drinkChangeSchema = z.object({
  drinkType: z.enum(DRINK_TYPES),
  day: z.iso.date(),
  change: z.union([z.literal(1), z.literal(-1)]),
});
export type DrinkChange = z.infer<typeof drinkChangeSchema>;
