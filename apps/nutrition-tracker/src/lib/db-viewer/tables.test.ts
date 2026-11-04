import { describe, expect, it } from "vitest";
import { isBadDataError, parseCellEdit, VIEWER_TABLES } from "./tables";

const rowId = "00000000-0000-4000-8000-000000000001";
const edit = { table: "app_nutrition.food_logs", column: "protein_g", rowId, value: "50" };

describe("isBadDataError", () => {
  const withCode = (code: string) => Object.assign(new Error("failed"), { code });

  it("recognises bad data and constraint failures", () => {
    expect(isBadDataError(withCode("23514"))).toBe(true);
    expect(isBadDataError(withCode("22P02"))).toBe(true);
  });

  it("leaves other failures alone so they aren't shown to the user", () => {
    expect(isBadDataError(withCode("42501"))).toBe(false);
    expect(isBadDataError(withCode("ECONNREFUSED"))).toBe(false);
    expect(isBadDataError(new Error("failed"))).toBe(false);
    expect(isBadDataError("23514")).toBe(false);
  });
});

describe("parseCellEdit", () => {
  it("accepts an editable column", () => {
    const result = parseCellEdit(edit);
    expect(result).toMatchObject({ ok: true, edit: { rowId, value: "50" } });
  });

  it.each([
    ["an unknown table", { ...edit, table: "auth.users" }],
    ["an injected table name", { ...edit, table: "app_nutrition.food_logs; drop table x" }],
    ["an unknown column", { ...edit, column: "password" }],
    ["an injected column name", { ...edit, column: 'protein_g" = 0; --' }],
    ["calculated calories", { ...edit, column: "calories" }],
    ["the primary key", { ...edit, column: "id" }],
    ["the owner", { ...edit, column: "user_id" }],
    ["the image URL", { ...edit, column: "image_url" }],
    ["the timezone", { ...edit, table: "app_nutrition.user_profiles", column: "timezone" }],
    ["session records", { ...edit, table: "app_nutrition.device_sessions", column: "ended_at" }],
  ])("refuses %s", (_name, input) => {
    expect(parseCellEdit(input).ok).toBe(false);
  });

  it("refuses a row id that isn't a UUID", () => {
    expect(parseCellEdit({ ...edit, rowId: "1 or 1=1" }).ok).toBe(false);
  });

  it("turns blank into null only where the column allows it", () => {
    expect(parseCellEdit({ ...edit, column: "notes", value: "  " })).toMatchObject({
      ok: true,
      edit: { value: null },
    });
    expect(parseCellEdit({ ...edit, value: "" })).toMatchObject({ ok: false });
  });

  it("has a key column on every table", () => {
    for (const table of VIEWER_TABLES) {
      expect(table.columns.some((column) => column.name === table.key)).toBe(true);
    }
  });
});
