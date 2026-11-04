import "server-only";
import type { TransactionSql } from "postgres";
import { withUser } from "../db";
import type { ChartPoint } from "./chart";
import type { MealRow } from "./group-logs";
import type { FoodLogInput, FoodLogUpdate, ProfileInput } from "./schemas";
import type { Workout, WorkoutInput } from "./workouts";

export type Profile = {
  displayName: string | null;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  currentWeightKg: number | null;
  goalWeightKg: number | null;
  timezone: string;
};

export type DayTotals = {
  day: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type DashboardData = {
  profile: Profile;
  today: string;
  todayTotals: DayTotals;
  /** Totals for logged days among the 7 complete days before today. */
  recentDays: DayTotals[];
  /** Meals from the last MEAL_WINDOW_DAYS days, newest first. */
  recentLogs: MealRow[];
  /** Recorded weights, oldest first. */
  weights: ChartPoint[];
  /** Recorded workouts, newest first. */
  workouts: Workout[];
};

export const MEAL_WINDOW_DAYS = 30;
/** A safety cap that normal use never reaches. */
const MEAL_ROW_LIMIT = 1000;
const WEIGHT_WINDOW_DAYS = 365;
const WORKOUT_ROW_LIMIT = 500;
const PROJECTION_WINDOW_DAYS = 7;

async function loadProfile(tx: TransactionSql, userId: string): Promise<Profile> {
  await tx`
    insert into app_nutrition.user_profiles (user_id)
    values (${userId})
    on conflict (user_id) do nothing
  `;

  const [profile] = await tx<Profile[]>`
    select
      display_name as "displayName",
      target_calories as "targetCalories",
      target_protein_g as "targetProteinG",
      target_carbs_g as "targetCarbsG",
      target_fat_g as "targetFatG",
      current_weight_kg::float8 as "currentWeightKg",
      goal_weight_kg::float8 as "goalWeightKg",
      timezone
    from app_nutrition.user_profiles
    where user_id = ${userId}
  `;

  if (!profile) throw new Error("Profile missing immediately after upsert");
  return profile;
}

/**
 * A fingerprint of recent meals and goals, covering adds, edits, and deletes.
 * Row level security decides whose rows it covers.
 */
export async function mealsVersion(tx: TransactionSql): Promise<string> {
  const [row] = await tx<{ version: string }[]>`
    select md5(concat_ws(
      '|',
      (
        select string_agg(t::text, ',' order by t.id)
        from app_nutrition.food_logs t
        where t.logged_at >= now() - make_interval(days => ${MEAL_WINDOW_DAYS})
      ),
      (select string_agg(p.updated_at::text, ',' order by p.user_id) from app_nutrition.user_profiles p),
      (select string_agg(w::text, ',' order by w.id) from app_nutrition.weight_logs w),
      (select string_agg(k::text, ',' order by k.id) from app_nutrition.workouts k)
    )) as version
  `;
  return row?.version ?? "";
}

export function getProfile(userId: string): Promise<Profile> {
  return withUser(userId, (tx) => loadProfile(tx, userId));
}

export function getDashboardData(userId: string): Promise<DashboardData> {
  return withUser(userId, async (tx) => {
    const profile = await loadProfile(tx, userId);
    const zone = profile.timezone;

    const [clock] = await tx<{ today: string; windowStart: string }[]>`
      select
        to_char(now() at time zone ${zone}, 'YYYY-MM-DD') as today,
        to_char(
          (now() at time zone ${zone}) - make_interval(days => ${PROJECTION_WINDOW_DAYS}),
          'YYYY-MM-DD'
        ) as "windowStart"
    `;
    if (!clock) throw new Error("Clock query returned no rows");

    const days = await tx<DayTotals[]>`
      select
        to_char(logged_at at time zone ${zone}, 'YYYY-MM-DD') as day,
        sum(calories)::int as calories,
        sum(protein_g)::float8 as "proteinG",
        sum(carbs_g)::float8 as "carbsG",
        sum(fat_g)::float8 as "fatG"
      from app_nutrition.food_logs
      where user_id = ${userId}
        -- A day of slack on the UTC filter covers any timezone offset.
        and logged_at >= now() - make_interval(days => ${PROJECTION_WINDOW_DAYS + 2})
      group by 1
      order by 1
    `;

    const recentLogs = await tx<MealRow[]>`
      select
        id,
        to_char(logged_at at time zone ${zone}, 'YYYY-MM-DD') as day,
        image_url as "imageUrl",
        food_name as "foodName",
        calories,
        protein_g::float8 as "proteinG",
        carbs_g::float8 as "carbsG",
        fat_g::float8 as "fatG",
        notes,
        logged_at as "loggedAt",
        to_char(logged_at at time zone ${zone}, 'YYYY-MM-DD"T"HH24:MI') as "loggedAtLocal"
      from app_nutrition.food_logs
      where user_id = ${userId}
        and logged_at >= now() - make_interval(days => ${MEAL_WINDOW_DAYS})
      order by logged_at desc
      limit ${MEAL_ROW_LIMIT}
    `;

    const weights = await tx<ChartPoint[]>`
      select to_char(logged_on, 'YYYY-MM-DD') as day, weight_kg::float8 as value
      from app_nutrition.weight_logs
      where user_id = ${userId}
        and logged_on >= ${clock.today}::date - ${WEIGHT_WINDOW_DAYS}::int
      order by logged_on
    `;

    const workouts = await tx<Workout[]>`
      select
        id,
        to_char(worked_out_on, 'YYYY-MM-DD') as day,
        workout_type as "workoutType",
        duration_minutes as "durationMinutes",
        calories_burned as "caloriesBurned"
      from app_nutrition.workouts
      where user_id = ${userId}
      order by worked_out_on desc, created_at desc
      limit ${WORKOUT_ROW_LIMIT}
    `;

    return {
      profile,
      weights: [...weights],
      workouts: [...workouts],
      today: clock.today,
      todayTotals: days.find((day) => day.day === clock.today) ?? {
        day: clock.today,
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      },
      recentDays: days.filter((day) => day.day >= clock.windowStart && day.day < clock.today),
      recentLogs: [...recentLogs],
    };
  });
}

export async function insertFoodLog(userId: string, input: FoodLogInput): Promise<void> {
  await withUser(userId, async (tx) => {
    await tx`
      insert into app_nutrition.food_logs
        (user_id, image_url, food_name, protein_g, carbs_g, fat_g)
      values (
        ${userId}, ${input.imageUrl}, ${input.foodName},
        ${input.proteinG}, ${input.carbsG}, ${input.fatG}
      )
    `;
  });
}

/** Returns false if the meal doesn't exist. loggedAt is in the user's timezone. */
export async function editFoodLog(
  userId: string,
  id: string,
  input: FoodLogUpdate,
): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const { timezone } = await loadProfile(tx, userId);
    const updated = await tx`
      update app_nutrition.food_logs
      set
        food_name = ${input.foodName},
        protein_g = ${input.proteinG},
        carbs_g = ${input.carbsG},
        fat_g = ${input.fatG},
        notes = ${input.notes},
        logged_at = ${input.loggedAt}::timestamp at time zone ${timezone}
      where id = ${id} and user_id = ${userId}
      returning 1
    `;
    return updated.length > 0;
  });
}

/** Records today's weight, replacing any earlier entry today, and makes it current. */
export async function recordWeight(userId: string, weightKg: number): Promise<void> {
  await withUser(userId, async (tx) => {
    const { timezone } = await loadProfile(tx, userId);

    await tx`
      insert into app_nutrition.weight_logs (user_id, logged_on, weight_kg)
      values (${userId}, (now() at time zone ${timezone})::date, ${weightKg})
      on conflict (user_id, logged_on) do update set weight_kg = excluded.weight_kg
    `;
    await tx`
      update app_nutrition.user_profiles
      set current_weight_kg = ${weightKg}
      where user_id = ${userId}
    `;
  });
}

export async function insertWorkout(userId: string, input: WorkoutInput): Promise<void> {
  await withUser(userId, async (tx) => {
    await tx`
      insert into app_nutrition.workouts
        (user_id, worked_out_on, workout_type, duration_minutes, calories_burned)
      values (
        ${userId}, ${input.workedOutOn}, ${input.workoutType},
        ${input.durationMinutes}, ${input.caloriesBurned}
      )
    `;
  });
}

/** Returns false if the workout doesn't exist. */
export async function editWorkout(
  userId: string,
  id: string,
  input: WorkoutInput,
): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const updated = await tx`
      update app_nutrition.workouts
      set
        worked_out_on = ${input.workedOutOn},
        workout_type = ${input.workoutType},
        duration_minutes = ${input.durationMinutes},
        calories_burned = ${input.caloriesBurned}
      where id = ${id} and user_id = ${userId}
      returning 1
    `;
    return updated.length > 0;
  });
}

export async function removeWorkout(userId: string, id: string): Promise<void> {
  await withUser(userId, async (tx) => {
    await tx`delete from app_nutrition.workouts where id = ${id} and user_id = ${userId}`;
  });
}

/** Deletes meals and returns the images they pointed to. */
export async function removeFoodLogs(userId: string, ids: readonly string[]): Promise<string[]> {
  return withUser(userId, async (tx) => {
    const deleted = await tx<{ imageUrl: string | null }[]>`
      delete from app_nutrition.food_logs
      where id in ${tx(ids)} and user_id = ${userId}
      returning image_url as "imageUrl"
    `;
    return deleted.flatMap(({ imageUrl }) => (imageUrl ? [imageUrl] : []));
  });
}

/** Returns false if Postgres doesn't recognise the timezone. */
export async function updateProfile(userId: string, input: ProfileInput): Promise<boolean> {
  return withUser(userId, async (tx) => {
    // Checked against Postgres because it's what evaluates `at time zone`.
    const [zone] = await tx`select 1 from pg_timezone_names where name = ${input.timezone}`;
    if (!zone) return false;

    await loadProfile(tx, userId);
    await tx`
      update app_nutrition.user_profiles
      set
        target_calories = ${input.targetCalories},
        target_protein_g = ${input.targetProteinG},
        target_carbs_g = ${input.targetCarbsG},
        target_fat_g = ${input.targetFatG},
        current_weight_kg = ${input.currentWeightKg},
        goal_weight_kg = ${input.goalWeightKg},
        timezone = ${input.timezone}
      where user_id = ${userId}
    `;
    return true;
  });
}
