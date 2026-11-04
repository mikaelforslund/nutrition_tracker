"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { endSession, eraseSession, removePerson } from "@/lib/sessions";
import { getStorage } from "@/lib/storage";
import { parseUploadKey } from "@/lib/storage/keys";

export type SessionActionResult = { status: "done" } | { status: "error"; message: string };

const idSchema = z.uuid();

async function changeSession(
  id: unknown,
  change: (id: string) => Promise<void>,
): Promise<SessionActionResult> {
  const parsed = idSchema.safeParse(id);
  if (getEnv().AUTH_MODE !== "mock" || !parsed.success) {
    return { status: "error", message: "That session can't be changed." };
  }

  await change(parsed.data);
  revalidatePath("/", "layout");
  return { status: "done" };
}

/** Signs a device out and keeps the session as Ended. */
export async function endSessionNow(id: unknown): Promise<SessionActionResult> {
  return changeSession(id, endSession);
}

/** Erases a session's record. The person and their meals stay. */
export async function removeSessionFromList(id: unknown): Promise<SessionActionResult> {
  return changeSession(id, eraseSession);
}

/** Permanently deletes a person with their sessions, meals, and photos. */
export async function deletePerson(userId: unknown): Promise<SessionActionResult> {
  const env = getEnv();
  const parsed = idSchema.safeParse(userId);

  if (env.AUTH_MODE !== "mock" || !parsed.success || parsed.data === env.MOCK_USER_ID) {
    return { status: "error", message: "That person can't be deleted." };
  }

  const imageUrls = await removePerson(parsed.data);

  const storage = getStorage();
  await Promise.all(
    imageUrls.map(async (imageUrl) => {
      const key = imageUrl.replace("/api/uploads/", "");
      if (parseUploadKey(key)?.ownerId !== parsed.data) return;

      // The person is already gone, so a leftover file shouldn't report as a failure.
      await storage
        .delete(key)
        .catch((error) => console.error(`couldn't delete upload ${key}`, error));
    }),
  );

  revalidatePath("/", "layout");
  return { status: "done" };
}
