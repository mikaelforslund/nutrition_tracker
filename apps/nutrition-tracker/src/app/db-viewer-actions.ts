"use server";

import { revalidatePath } from "next/cache";
import { getActingUser } from "@/lib/auth";
import {
  readViewerTables,
  updateViewerCell,
  type ViewerTableData,
} from "@/lib/db-viewer/repository";
import { isBadDataError, parseCellEdit } from "@/lib/db-viewer/tables";
import { getEnv } from "@/lib/env";

export type ViewerLoadResult =
  | { status: "ok"; tables: ViewerTableData[] }
  | { status: "error"; message: string };

export type CellSaveResult = { status: "saved" } | { status: "error"; message: string };

async function viewerUser(asUserId: string | undefined) {
  if (getEnv().ENABLE_DB_VIEWER !== "true") return null;
  return getActingUser(asUserId);
}

export async function loadViewerTables(asUserId?: string): Promise<ViewerLoadResult> {
  const user = await viewerUser(asUserId);
  if (!user) return { status: "error", message: "The database viewer isn't available." };

  return { status: "ok", tables: await readViewerTables(user.id) };
}

export async function saveViewerCell(input: unknown, asUserId?: string): Promise<CellSaveResult> {
  const user = await viewerUser(asUserId);
  if (!user) return { status: "error", message: "The database viewer isn't available." };

  const parsed = parseCellEdit(input);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    const updated = await updateViewerCell(user.id, parsed.edit);
    if (!updated) return { status: "error", message: "That row no longer exists." };
  } catch (error) {
    if (isBadDataError(error)) {
      return { status: "error", message: `Postgres refused this: ${error.message}` };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return { status: "saved" };
}
