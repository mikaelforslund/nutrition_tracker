"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActingUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import {
  changeDrinkGlasses,
  editFoodLog,
  editWorkout,
  insertFoodLog,
  insertMealCopy,
  isFutureDay,
  insertWorkout,
  readMealSource,
  recordWeight,
  removeFoodLogs,
  removeWorkout,
  updateProfile,
} from "@/lib/nutrition/repository";
import {
  foodLogInputSchema,
  foodLogUpdateSchema,
  profileInputSchema,
  weightSchema,
} from "@/lib/nutrition/schemas";
import { drinkChangeSchema } from "@/lib/nutrition/drinks";
import { parseDecimal } from "@/lib/nutrition/manual-meal";
import { hasNoWorkoutDetails, workoutInputSchema } from "@/lib/nutrition/workouts";
import { getStorage } from "@/lib/storage";
import {
  createUploadKey,
  isOwnUploadUrl,
  ownUploadKey,
  parseUploadKey,
  uploadKey,
  uploadUrl,
} from "@/lib/storage/keys";
import { isAllowedImageUrl } from "@/lib/vision/image";

export type ActionResult = { status: "idle" | "saved" | "error"; message?: string };

const FUTURE_DAY_MESSAGE = "Pick today or an earlier day.";

export async function saveFoodLog(input: unknown, asUserId?: string): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to save meals." };

  const parsed = foodLogInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Check the meal details and try again." };
  }

  const { imageUrl } = parsed.data;
  const imageIsTrusted =
    imageUrl === null ||
    isOwnUploadUrl(imageUrl, user.id) ||
    isAllowedImageUrl(imageUrl, getEnv().VISION_ALLOWED_IMAGE_HOSTS);
  if (!imageIsTrusted) {
    return { status: "error", message: "That image can't be attached to a meal." };
  }

  if (parsed.data.day && (await isFutureDay(user.id, parsed.data.day))) {
    return { status: "error", message: FUTURE_DAY_MESSAGE };
  }

  await insertFoodLog(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function updateFoodLog(
  id: string,
  asUserId: string | undefined,
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to edit meals." };

  const parsedId = z.uuid().safeParse(id);
  const parsed = foodLogUpdateSchema.safeParse(Object.fromEntries(form));
  if (!parsedId.success || !parsed.success) {
    return { status: "error", message: "Check the meal details and try again." };
  }

  const updated = await editFoodLog(user.id, parsedId.data, parsed.data);
  if (!updated) return { status: "error", message: "That meal no longer exists." };

  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function saveWeight(
  weightKg: unknown,
  day: unknown,
  asUserId?: string,
): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to record your weight." };

  const parsed = weightSchema.safeParse(weightKg);
  if (!parsed.success) return { status: "error", message: "Enter a weight between 20 and 500 kg." };

  const parsedDay = z.iso.date().safeParse(day);
  if (!parsedDay.success) return { status: "error", message: "Pick a day for this weight." };
  if (await isFutureDay(user.id, parsedDay.data)) {
    return { status: "error", message: FUTURE_DAY_MESSAGE };
  }

  await recordWeight(user.id, parsed.data, parsedDay.data);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/** Adds a workout, or updates one when given an id. A weight is saved to the same day. */
export async function saveWorkout(
  id: string | null,
  asUserId: string | undefined,
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to record workouts." };

  const weightField = String(form.get("weightKg") ?? "").trim();
  const weight = weightField ? weightSchema.safeParse(parseDecimal(weightField)) : null;
  if (weight && !weight.success) {
    return { status: "error", message: "Enter a weight between 20 and 500 kg." };
  }

  const day = z.iso.date().safeParse(form.get("workedOutOn"));
  if (!day.success) return { status: "error", message: "Check the workout details and try again." };
  if (await isFutureDay(user.id, day.data)) {
    return { status: "error", message: FUTURE_DAY_MESSAGE };
  }

  if (!weight || !hasNoWorkoutDetails(form)) {
    const parsed = workoutInputSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      return { status: "error", message: "Check the workout details and try again." };
    }

    if (id === null) {
      await insertWorkout(user.id, parsed.data);
    } else {
      const parsedId = z.uuid().safeParse(id);
      const updated = parsedId.success && (await editWorkout(user.id, parsedId.data, parsed.data));
      if (!updated) return { status: "error", message: "That workout no longer exists." };
    }
  }

  if (weight) await recordWeight(user.id, weight.data, day.data);

  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function deleteWorkout(id: unknown, asUserId?: string): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to delete workouts." };

  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { status: "error", message: "That workout couldn't be found." };

  await removeWorkout(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/** Adds or takes away one glass of a drink on a day. */
export async function changeDrink(input: unknown, asUserId?: string): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to record drinks." };

  const parsed = drinkChangeSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That drink couldn't be saved." };

  await changeDrinkGlasses(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

const pasteSchema = z.object({ id: z.uuid(), day: z.iso.date() });

/** The copy gets its own file, so deleting either meal can't break the other's photo. */
async function copyPhoto(imageUrl: string | null, userId: string): Promise<string | null> {
  const key = imageUrl ? uploadKey(imageUrl) : null;
  if (!key) return imageUrl;

  const storage = getStorage();
  const bytes = await storage.get(key);
  const parsed = parseUploadKey(key);
  if (!bytes || !parsed) return null;

  const extension = key.split(".").pop() as "jpg" | "png" | "webp";
  const newKey = createUploadKey(userId, extension);
  await storage.put(newKey, bytes, parsed.contentType);
  return uploadUrl(newKey);
}

export async function pasteFoodLog(
  id: unknown,
  day: unknown,
  asUserId?: string,
): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to add meals." };

  const parsed = pasteSchema.safeParse({ id, day });
  if (!parsed.success) return { status: "error", message: "That meal can't be pasted." };
  if (await isFutureDay(user.id, parsed.data.day)) {
    return { status: "error", message: FUTURE_DAY_MESSAGE };
  }

  const meal = await readMealSource(user.id, parsed.data.id);
  if (!meal) return { status: "error", message: "The copied meal no longer exists." };

  await insertMealCopy(user.id, meal, await copyPhoto(meal.imageUrl, user.id), parsed.data.day);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

const mealIdsSchema = z.array(z.uuid()).min(1).max(1000);

export async function deleteFoodLogs(ids: unknown, asUserId?: string): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to delete meals." };

  const parsed = mealIdsSchema.safeParse(ids);
  if (!parsed.success) return { status: "error", message: "Those meals couldn't be found." };

  const imageUrls = await removeFoodLogs(user.id, parsed.data);

  const storage = getStorage();
  await Promise.all(
    imageUrls.map(async (imageUrl) => {
      const key = ownUploadKey(imageUrl, user.id);
      if (!key) return;

      // The meal is already gone, so a leftover file shouldn't report as a failure.
      await storage
        .delete(key)
        .catch((error) => console.error(`couldn't delete upload ${key}`, error));
    }),
  );

  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function saveProfile(
  asUserId: string | undefined,
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to change your goals." };

  const parsed = profileInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { status: "error", message: `Check the value for ${String(field)}.` };
  }

  const saved = await updateProfile(user.id, parsed.data);
  if (!saved) return { status: "error", message: "That timezone isn't recognised." };

  revalidatePath("/", "layout");
  return { status: "saved", message: "Goals saved." };
}
