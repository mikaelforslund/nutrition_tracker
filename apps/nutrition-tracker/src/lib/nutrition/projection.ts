/** Common rule of thumb for the energy content of one kilogram of body weight. */
const KCAL_PER_KG = 7700;

/** Rule of thumb for the calories a moderately active adult burns per kg of body weight. */
export const MAINTENANCE_KCAL_PER_KG = 30;

/** Fewer complete days than this is too noisy to project from. */
export const MIN_LOGGED_DAYS = 3;

/** Past this, a date implies more precision than the estimate has. */
const MAX_PROJECTION_DAYS = 3650;

const GOAL_REACHED_TOLERANCE_KG = 0.1;

export type ProjectionInput = {
  currentWeightKg: number | null;
  goalWeightKg: number | null;
  /** Net calories (eaten minus burned) for recent complete days. Days with no meals are left out. */
  dailyCalories: readonly number[];
  /** The user's local date, as YYYY-MM-DD. */
  today: string;
};

export type Projection =
  | { status: "needs_profile"; message: string }
  | { status: "needs_data"; message: string }
  | { status: "reached"; message: string }
  | { status: "off_track"; message: string }
  | { status: "on_track"; targetDate: string; daysRemaining: number; message: string };

const kcal = (value: number) => `${Math.round(value).toLocaleString("en-US")} kcal`;
const kg = (value: number) => `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`;

function addDays(date: string, days: number): Date {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function projectGoalWeight(input: ProjectionInput): Projection {
  const { currentWeightKg, goalWeightKg, dailyCalories, today } = input;

  if (currentWeightKg === null || goalWeightKg === null) {
    return {
      status: "needs_profile",
      message: "Add your current weight and goal weight to see a projection.",
    };
  }

  const remainingKg = goalWeightKg - currentWeightKg;
  if (Math.abs(remainingKg) < GOAL_REACHED_TOLERANCE_KG) {
    return { status: "reached", message: `You're at your ${kg(goalWeightKg)} goal.` };
  }

  if (dailyCalories.length < MIN_LOGGED_DAYS) {
    const needed = MIN_LOGGED_DAYS - dailyCalories.length;
    return {
      status: "needs_data",
      message: `Log ${needed} more full ${needed === 1 ? "day" : "days"} to see a projection.`,
    };
  }

  const averageCalories = dailyCalories.reduce((sum, day) => sum + day, 0) / dailyCalories.length;
  const maintenanceCalories = currentWeightKg * MAINTENANCE_KCAL_PER_KG;
  // Positive when eating above maintenance, which is the direction of weight gain.
  const dailySurplus = averageCalories - maintenanceCalories;
  const losing = remainingKg < 0;
  const movingTowardGoal = losing ? dailySurplus < 0 : dailySurplus > 0;

  if (!movingTowardGoal) {
    const relation = dailySurplus === 0 ? "at" : dailySurplus > 0 ? "above" : "below";
    return {
      status: "off_track",
      message:
        `Your recent net average of ${kcal(averageCalories)} is ${relation} your ` +
        `estimated ${kcal(maintenanceCalories)} maintenance, so you aren't moving toward ${kg(goalWeightKg)}.`,
    };
  }

  const daysRemaining = Math.ceil((Math.abs(remainingKg) * KCAL_PER_KG) / Math.abs(dailySurplus));
  if (daysRemaining > MAX_PROJECTION_DAYS) {
    return {
      status: "off_track",
      message: `At your recent net average of ${kcal(averageCalories)}, ${kg(goalWeightKg)} is more than 10 years away.`,
    };
  }

  const targetDate = addDays(today, daysRemaining).toLocaleDateString("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  });

  return {
    status: "on_track",
    targetDate,
    daysRemaining,
    message:
      `At your recent net average of ${kcal(averageCalories)} after workouts, a daily ` +
      `${losing ? "deficit" : "surplus"} of ${kcal(Math.abs(dailySurplus))} takes you from ` +
      `${kg(currentWeightKg)} to ${kg(goalWeightKg)} in about ${daysRemaining} days.`,
  };
}
