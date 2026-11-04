import { describe, expect, it } from "vitest";
import { foodLogUpdateSchema, profileInputSchema } from "./schemas";

const form = {
  targetCalories: "2000",
  targetProteinG: "130",
  targetCarbsG: "220",
  targetFatG: "65",
  currentWeightKg: "80.5",
  goalWeightKg: "",
  timezone: "UTC",
};

describe("foodLogUpdateSchema", () => {
  const meal = {
    foodName: " Soup ",
    proteinG: "12.5",
    carbsG: "30",
    fatG: "9",
    loggedAt: "2026-03-10T12:30",
    notes: "  ",
  };

  it("parses form values and stores blank notes as null", () => {
    expect(foodLogUpdateSchema.parse(meal)).toEqual({
      foodName: "Soup",
      proteinG: 12.5,
      carbsG: 30,
      fatG: 9,
      loggedAt: "2026-03-10T12:30",
      notes: null,
    });
  });

  it("rejects bad values", () => {
    expect(foodLogUpdateSchema.safeParse({ ...meal, proteinG: "-1" }).success).toBe(false);
    expect(foodLogUpdateSchema.safeParse({ ...meal, loggedAt: "yesterday" }).success).toBe(false);
    expect(foodLogUpdateSchema.safeParse({ ...meal, foodName: "  " }).success).toBe(false);
  });
});

describe("profileInputSchema", () => {
  it("turns blank optional fields into null rather than 0", () => {
    expect(profileInputSchema.parse(form)).toMatchObject({
      currentWeightKg: 80.5,
      goalWeightKg: null,
    });
  });

  it("rejects non-numeric optional values", () => {
    expect(profileInputSchema.safeParse({ ...form, goalWeightKg: "abc" }).success).toBe(false);
  });
});
