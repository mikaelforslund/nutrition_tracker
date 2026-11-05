import { describe, expect, it } from "vitest";
import { monthLabel, monthPattern, monthSummary, shortDayLabel, type HistoryDay } from "./history";

const day = (meals: number, calories: number): HistoryDay => ({
  day: "2026-03-10",
  meals,
  calories,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  burned: 0,
  goalScore: 50,
});

describe("labels", () => {
  it("formats a month and a day", () => {
    expect(monthLabel("2026-03")).toBe("March 2026");
    expect(shortDayLabel("2026-03-10")).toBe("Tue 10");
  });
});

describe("monthPattern", () => {
  it("accepts only real months", () => {
    expect(monthPattern.test("2026-12")).toBe(true);
    expect(monthPattern.test("2026-13")).toBe(false);
    expect(monthPattern.test("2026-1'; drop")).toBe(false);
  });
});

describe("monthSummary", () => {
  it("averages only days with meals", () => {
    expect(monthSummary([day(3, 2000), day(2, 1000), day(0, 0)])).toEqual({
      logged: 2,
      averageCalories: 1500,
    });
  });

  it("handles a month with no meals", () => {
    expect(monthSummary([day(0, 0)])).toEqual({ logged: 0, averageCalories: null });
  });
});
