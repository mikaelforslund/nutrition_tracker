"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActingUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import {
  editFoodLog,
  editWorkout,
  insertFoodLog,
  insertWorkout,
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
import { workoutInputSchema } from "@/lib/nutrition/workouts";
import { getStorage } from "@/lib/storage";
import { isOwnUploadUrl, ownUploadKey } from "@/lib/storage/keys";
import { isAllowedImageUrl } from "@/lib/vision/image";

export type ActionResult = { status: "idle" | "saved" | "error"; message?: string };

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

export async function saveWeight(weightKg: unknown, asUserId?: string): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to record your weight." };

  const parsed = weightSchema.safeParse(weightKg);
  if (!parsed.success) return { status: "error", message: "Enter a weight between 20 and 500 kg." };

  await recordWeight(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/** Adds a workout, or updates one when given an id. */
export async function saveWorkout(
  id: string | null,
  asUserId: string | undefined,
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const user = await getActingUser(asUserId);
  if (!user) return { status: "error", message: "Sign in to record workouts." };

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
