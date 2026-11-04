import { z } from "zod";

export type ColumnType = "uuid" | "text" | "integer" | "numeric" | "timestamptz";

export type ViewerColumn = {
  name: string;
  type: ColumnType;
  editable?: boolean;
  nullable?: boolean;
};

export type ViewerTable = {
  schema: string;
  table: string;
  key: string;
  orderBy: string;
  /** No database role but the server's can read this table, and only with mock auth. */
  serverOnly?: boolean;
  columns: readonly ViewerColumn[];
};

/**
 * Everything the viewer can reach. Requests can only name entries from this
 * list, so no caller-supplied text ever becomes a SQL identifier.
 *
 * Keys, owners, and audit columns stay read-only, as do calories (calculated by the
 * database), image_url (it's rendered
 * in the page) and timezone (a bad value breaks the dashboard; Goals validates it).
 */
export const VIEWER_TABLES: readonly ViewerTable[] = [
  {
    schema: "app_nutrition",
    table: "user_profiles",
    key: "user_id",
    orderBy: "user_id",
    columns: [
      { name: "user_id", type: "uuid" },
      { name: "display_name", type: "text", editable: true, nullable: true },
      { name: "target_calories", type: "integer", editable: true },
      { name: "target_protein_g", type: "integer", editable: true },
      { name: "target_carbs_g", type: "integer", editable: true },
      { name: "target_fat_g", type: "integer", editable: true },
      { name: "current_weight_kg", type: "numeric", editable: true, nullable: true },
      { name: "goal_weight_kg", type: "numeric", editable: true, nullable: true },
      { name: "timezone", type: "text" },
      { name: "created_at", type: "timestamptz" },
      { name: "updated_at", type: "timestamptz" },
    ],
  },
  {
    schema: "app_nutrition",
    table: "food_logs",
    key: "id",
    orderBy: "logged_at desc",
    columns: [
      { name: "id", type: "uuid" },
      { name: "user_id", type: "uuid" },
      { name: "food_name", type: "text", editable: true },
      { name: "calories", type: "integer" },
      { name: "protein_g", type: "numeric", editable: true },
      { name: "carbs_g", type: "numeric", editable: true },
      { name: "fat_g", type: "numeric", editable: true },
      { name: "notes", type: "text", editable: true, nullable: true },
      { name: "image_url", type: "text" },
      { name: "logged_at", type: "timestamptz", editable: true },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    schema: "app_nutrition",
    table: "weight_logs",
    key: "id",
    orderBy: "logged_on desc",
    columns: [
      { name: "id", type: "uuid" },
      { name: "user_id", type: "uuid" },
      { name: "logged_on", type: "text" },
      { name: "weight_kg", type: "numeric", editable: true },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    schema: "app_nutrition",
    table: "workouts",
    key: "id",
    orderBy: "worked_out_on desc",
    columns: [
      { name: "id", type: "uuid" },
      { name: "user_id", type: "uuid" },
      { name: "worked_out_on", type: "text" },
      { name: "workout_type", type: "text", editable: true },
      { name: "duration_minutes", type: "integer", editable: true },
      { name: "calories_burned", type: "integer", editable: true },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    schema: "app_nutrition",
    table: "device_sessions",
    key: "id",
    orderBy: "created_at desc",
    serverOnly: true,
    columns: [
      { name: "id", type: "uuid" },
      { name: "user_id", type: "uuid" },
      { name: "device_id", type: "uuid" },
      { name: "device_label", type: "text" },
      { name: "created_at", type: "timestamptz" },
      { name: "last_seen_at", type: "timestamptz" },
      { name: "ended_at", type: "timestamptz" },
    ],
  },
];

/**
 * True for SQLSTATE classes 22 and 23: bad data and failed constraints, which are
 * safe and useful to show. Matches on the code because `instanceof` fails once the
 * driver's error class has been through the production bundler.
 */
export function isBadDataError(error: unknown): error is Error {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return typeof error.code === "string" && /^2[23][0-9A-Z]{3}$/.test(error.code);
}

const cellEditSchema = z.object({
  table: z.string(),
  column: z.string(),
  rowId: z.uuid(),
  value: z.string().max(2000),
});

export type CellEdit = {
  table: ViewerTable;
  column: ViewerColumn;
  rowId: string;
  value: string | null;
};

export type CellEditResult = { ok: true; edit: CellEdit } | { ok: false; message: string };

/** Checks an edit against the allowlist. A blank value means null. */
export function parseCellEdit(input: unknown): CellEditResult {
  const parsed = cellEditSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That edit isn't valid." };

  const { table: tableName, column: columnName, rowId, value } = parsed.data;
  const table = VIEWER_TABLES.find((item) => `${item.schema}.${item.table}` === tableName);
  const column = table?.columns.find((item) => item.name === columnName);

  if (!table || !column?.editable) {
    return { ok: false, message: "That column can't be edited here." };
  }

  const trimmed = value.trim();
  if (trimmed === "" && !column.nullable) {
    return { ok: false, message: `${column.name} can't be empty.` };
  }

  return { ok: true, edit: { table, column, rowId, value: trimmed === "" ? null : trimmed } };
}
