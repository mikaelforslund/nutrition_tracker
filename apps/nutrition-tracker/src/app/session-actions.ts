"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import {
  deleteSessionGroup,
  endSession,
  eraseSession,
  movePersonToGroup,
  removePerson,
  saveSessionGroup,
} from "@/lib/sessions";
import { getStorage } from "@/lib/storage";
import { parseUploadKey } from "@/lib/storage/keys";

export type SessionActionResult = { status: "done" } | { status: "error"; message: string };

const idSchema = z.uuid();
const groupNameSchema = z.string().trim().min(1).max(40);

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

/** Adds a group, or renames one when given an id. */
export async function saveGroup(id: unknown, name: unknown): Promise<SessionActionResult> {
  const parsedId = idSchema.nullable().safeParse(id);
  const parsedName = groupNameSchema.safeParse(name);
  if (getEnv().AUTH_MODE !== "mock" || !parsedId.success) {
    return { status: "error", message: "That group can't be changed." };
  }
  if (!parsedName.success) return { status: "error", message: "Enter a name of up to 40 characters." };

  const saved = await saveSessionGroup(parsedId.data, parsedName.data);
  if (!saved) return { status: "error", message: `There's already a group called ${parsedName.data}.` };

  revalidatePath("/", "layout");
  return { status: "done" };
}

/** Deletes a group. Its people stay, ungrouped. */
export async function deleteGroup(id: unknown): Promise<SessionActionResult> {
  return changeSession(id, deleteSessionGroup);
}

/** Puts a person and all their devices in a group, or in none when given null. */
export async function movePerson(userId: unknown, groupId: unknown): Promise<SessionActionResult> {
  const parsedUser = idSchema.safeParse(userId);
  const parsedGroup = idSchema.nullable().safeParse(groupId);
  if (getEnv().AUTH_MODE !== "mock" || !parsedUser.success || !parsedGroup.success) {
    return { status: "error", message: "That person can't be moved." };
  }

  const moved = await movePersonToGroup(parsedUser.data, parsedGroup.data);
  if (!moved) return { status: "error", message: "That group no longer exists." };

  revalidatePath("/", "layout");
  return { status: "done" };
}
