import { describe, expect, it } from "vitest";
import { foodLogUpdateSchema, profileInputSchema } from "./schemas";

const form = {
  targetCalories: "2000",
  targetProteinG: "130",
  targetCarbsG: "220",
  targetFatG: "65",
  targetGlasses: "10",
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
  it("keeps the drinks goal between 1 and 50 glasses", () => {
    expect(profileInputSchema.parse(form).targetGlasses).toBe(10);
    expect(profileInputSchema.safeParse({ ...form, targetGlasses: "0" }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...form, targetGlasses: "51" }).success).toBe(false);
  });

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
