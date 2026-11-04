import { describe, expect, it } from "vitest";
import { EMPTY_MANUAL_MEAL, manualMealToLog, parseDecimal } from "./manual-meal";

const powder = {
  ...EMPTY_MANUAL_MEAL,
  foodName: "Protein Powder",
  proteinG: "24",
  carbsG: "3",
  fatG: "1.5",
};

describe("manualMealToLog", () => {
  it("keeps one serving as entered", () => {
    expect(manualMealToLog(powder)).toEqual({
      foodName: "Protein Powder",
      proteinG: 24,
      carbsG: 3,
      fatG: 1.5,
      imageUrl: null,
    });
  });

  it("multiplies by quantity and names it", () => {
    expect(manualMealToLog({ ...powder, quantity: 2 })).toMatchObject({
      foodName: "Protein Powder × 2",
      proteinG: 48,
      carbsG: 6,
      fatG: 3,
    });
  });

  it("handles half servings", () => {
    expect(manualMealToLog({ ...powder, quantity: 0.5 })).toMatchObject({
      foodName: "Protein Powder × 0.5",
      fatG: 0.8,
    });
  });

  it("accepts comma decimals", () => {
    expect(parseDecimal("31,5")).toBe(31.5);
    expect(manualMealToLog({ ...powder, fatG: "1,5" })?.fatG).toBe(1.5);
  });

  it("treats blank macros as zero", () => {
    expect(
      manualMealToLog({ ...EMPTY_MANUAL_MEAL, foodName: "Olive oil", fatG: "14" }),
    ).toMatchObject({ proteinG: 0, carbsG: 0, fatG: 14 });
  });

  it.each([
    ["no name", { ...powder, foodName: "   " }],
    ["nothing entered", { ...EMPTY_MANUAL_MEAL, foodName: "Apple" }],
    ["letters", { ...powder, proteinG: "lots" }],
    ["a negative value", { ...powder, fatG: "-1" }],
    ["an impossible total", { ...powder, proteinG: "99999" }],
  ])("rejects %s", (_name, draft) => {
    expect(manualMealToLog(draft)).toBeNull();
  });
});
