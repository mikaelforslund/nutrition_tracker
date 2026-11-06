import { describe, expect, it } from "vitest";
import {
  drinkChangeSchema,
  drinkDays,
  drinkSummary,
  editableDrinkDays,
  glassesLabel,
  glassesSeries,
  type DrinkLog,
} from "./drinks";

const logs: DrinkLog[] = [
  { day: "2026-03-09", drinkType: "water", glasses: 4 },
  { day: "2026-03-10", drinkType: "water", glasses: 2 },
  { day: "2026-03-10", drinkType: "coffee", glasses: 1 },
];

describe("drinkDays", () => {
  it("adds every drink into the day's total, newest day first", () => {
    expect(drinkDays(logs)).toEqual([
      { day: "2026-03-10", total: 3, water: 2, coffee: 1, tea: 0, other: 0 },
      { day: "2026-03-09", total: 4, water: 4, coffee: 0, tea: 0, other: 0 },
    ]);
  });
});

describe("editableDrinkDays", () => {
  it("lists the past week even with nothing logged, across a month end", () => {
    const days = editableDrinkDays([], "2026-03-03");
    expect(days).toHaveLength(7);
    expect(days[0]?.day).toBe("2026-03-03");
    expect(days[6]?.day).toBe("2026-02-25");
  });

  it("keeps older logged days after the past week", () => {
    const days = editableDrinkDays([{ day: "2026-03-01", drinkType: "tea", glasses: 2 }], "2026-03-20");
    expect(days).toHaveLength(8);
    expect(days.at(-1)).toMatchObject({ day: "2026-03-01", tea: 2, total: 2 });
  });
});

describe("glassesSeries", () => {
  it("gives daily totals oldest first", () => {
    expect(glassesSeries(logs)).toEqual([
      { day: "2026-03-09", value: 4 },
      { day: "2026-03-10", value: 3 },
    ]);
  });
});

describe("labels", () => {
  it("names only the drinks that were had", () => {
    expect(drinkSummary({ day: "2026-03-10", total: 3, water: 2, coffee: 1, tea: 0, other: 0 })).toBe(
      "2 water, 1 coffee",
    );
  });

  it("uses the singular for one glass", () => {
    expect(glassesLabel(1)).toBe("1 glass");
    expect(glassesLabel(2)).toBe("2 glasses");
  });
});

describe("drinkChangeSchema", () => {
  const change = { drinkType: "water", day: "2026-03-10", change: 1 };

  it("accepts one glass up or down", () => {
    expect(drinkChangeSchema.safeParse(change).success).toBe(true);
    expect(drinkChangeSchema.safeParse({ ...change, change: -1 }).success).toBe(true);
  });

  it("rejects other amounts and unknown drinks", () => {
    expect(drinkChangeSchema.safeParse({ ...change, change: 5 }).success).toBe(false);
    expect(drinkChangeSchema.safeParse({ ...change, drinkType: "beer" }).success).toBe(false);
  });
});
