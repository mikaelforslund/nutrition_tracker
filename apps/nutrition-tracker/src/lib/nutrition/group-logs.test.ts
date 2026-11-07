import { describe, expect, it } from "vitest";
import { dayLabel, goalScore, groupLogsByDay, netCalories, type MealRow } from "./group-logs";

const meal = (overrides: Partial<MealRow>): MealRow => ({
  id: "1",
  day: "2026-03-10",
  imageUrl: null,
  foodName: "Soup",
  calories: 100,
  proteinG: 0.1,
  carbsG: 0.2,
  fatG: 1,
  notes: null,
  loggedAt: new Date("2026-03-10T12:00:00Z"),
  loggedAtLocal: "2026-03-10T12:00",
  ...overrides,
});

describe("goalScore", () => {
  it("is 100 on target", () => {
    expect(goalScore(2000, 2000)).toBe(100);
  });

  it("treats over and under the same", () => {
    expect(goalScore(1500, 2000)).toBe(75);
    expect(goalScore(2500, 2000)).toBe(75);
  });

  it("never drops below 25", () => {
    expect(goalScore(100, 2000)).toBe(25);
    expect(goalScore(9000, 2000)).toBe(25);
  });
});

describe("groupLogsByDay", () => {
  it("scores each day on its total, not on single meals", () => {
    const [day] = groupLogsByDay(
      [meal({ id: "1", calories: 900 }), meal({ id: "2", calories: 900 })],
      "2026-03-10",
      "UTC",
      2000,
    );
    expect(day?.goalScore).toBe(90);
  });

  it("nests meals under their day and sums the totals", () => {
    const [today, ...rest] = groupLogsByDay(
      [meal({ id: "1" }), meal({ id: "2", calories: 250 })],
      "2026-03-10",
      "UTC",
      2000,
    );

    expect(rest).toEqual([]);
    expect(today).toMatchObject({ day: "2026-03-10", label: "Today", calories: 350 });
    expect(today?.meals.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("scores a day on its net calories", () => {
    const [day] = groupLogsByDay(
      [meal({ calories: 2300 })],
      "2026-03-10",
      "UTC",
      2000,
      new Map([["2026-03-10", 300]]),
    );

    expect(day?.calories).toBe(2300);
    expect(day?.burned).toBe(300);
    expect(day?.goalScore).toBe(100);
  });

  it("doesn't accumulate floating point noise in totals", () => {
    const [day] = groupLogsByDay([meal({ id: "1" }), meal({ id: "2" })], "2026-03-10", "UTC", 2000);
    expect(day?.proteinG).toBe(0.2);
    expect(day?.carbsG).toBe(0.4);
  });

  it("labels recent days and keeps newest first", () => {
    const groups = groupLogsByDay(
      [meal({ day: "2026-03-10" }), meal({ day: "2026-03-09" }), meal({ day: "2026-03-01" })],
      "2026-03-10",
      "UTC",
      2000,
    );

    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", "Sun, Mar 1"]);
  });

  it("handles a month boundary for yesterday", () => {
    const [day] = groupLogsByDay([meal({ day: "2026-02-28" })], "2026-03-01", "UTC", 2000);
    expect(day?.label).toBe("Yesterday");
  });

  it("shows times in the user's timezone", () => {
    const [day] = groupLogsByDay([meal({})], "2026-03-10", "Asia/Tokyo", 2000);
    expect(day?.meals[0]?.time).toBe("9:00 PM");
  });
});

describe("dayLabel", () => {
  it("names today and yesterday, and dates anything older", () => {
    expect(dayLabel("2026-03-03", "2026-03-03")).toBe("Today");
    expect(dayLabel("2026-03-02", "2026-03-03")).toBe("Yesterday");
    expect(dayLabel("2026-02-25", "2026-03-03")).toBe("Wed, Feb 25");
  });
});

describe("netCalories", () => {
  it("takes the day's workouts off what was eaten", () => {
    expect(netCalories({ calories: 1800, burned: 250 })).toBe(1550);
    expect(netCalories({ calories: 1800, burned: 0 })).toBe(1800);
  });
});
