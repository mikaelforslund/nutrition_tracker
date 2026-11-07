import { describe, expect, it } from "vitest";
import { burnedByDay, hasNoWorkoutDetails, workoutInputSchema } from "./workouts";

const form = {
  workoutType: " Running ",
  durationMinutes: "45",
  caloriesBurned: "410",
  workedOutOn: "2026-03-10",
};

describe("burnedByDay", () => {
  const workout = (day: string, caloriesBurned: number) => ({
    id: "1",
    day,
    workoutType: "Running",
    durationMinutes: 30,
    caloriesBurned,
  });

  it("adds up several workouts on one day", () => {
    const totals = burnedByDay([
      workout("2026-03-10", 300),
      workout("2026-03-10", 150),
      workout("2026-03-09", 200),
    ]);

    expect(totals.get("2026-03-10")).toBe(450);
    expect(totals.get("2026-03-09")).toBe(200);
  });
});

describe("workoutInputSchema", () => {
  it("parses form values", () => {
    expect(workoutInputSchema.parse(form)).toEqual({
      workoutType: "Running",
      durationMinutes: 45,
      caloriesBurned: 410,
      workedOutOn: "2026-03-10",
    });
  });

  it.each([
    ["no type", { ...form, workoutType: "  " }],
    ["no time", { ...form, durationMinutes: "0" }],
    ["over a day", { ...form, durationMinutes: "1441" }],
    ["negative calories", { ...form, caloriesBurned: "-1" }],
    ["fractions of a minute", { ...form, durationMinutes: "4.5" }],
    ["an invalid date", { ...form, workedOutOn: "2026-13-40" }],
  ])("rejects %s", (_name, input) => {
    expect(workoutInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("hasNoWorkoutDetails", () => {
  const filled = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  };

  it("ignores the date and weight", () => {
    const blank = { workoutType: " ", durationMinutes: "", caloriesBurned: "" };
    expect(hasNoWorkoutDetails(filled({ ...blank, workedOutOn: "2026-03-10", weightKg: "80" }))).toBe(true);
  });

  it("spots a half-filled workout", () => {
    expect(hasNoWorkoutDetails(filled({ durationMinutes: "20" }))).toBe(false);
  });
});
