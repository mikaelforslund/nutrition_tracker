import { describe, expect, it } from "vitest";
import { recommendTargets } from "./targets";

describe("recommendTargets", () => {
  it("sets a deficit when losing weight", () => {
    expect(recommendTargets(88, 85)).toEqual({
      targetCalories: 2140,
      targetProteinG: 155,
      targetFatG: 60,
      targetCarbsG: 245,
    });
  });

  it("sets a surplus when gaining weight", () => {
    expect(recommendTargets(70, 75)?.targetCalories).toBe(2400);
  });

  it("holds at maintenance when already at the goal", () => {
    expect(recommendTargets(80, 80)?.targetCalories).toBe(2400);
  });

  it("never drops below the calorie floor", () => {
    expect(recommendTargets(50, 40)?.targetCalories).toBe(1200);
  });

  it("gives macros that add up to about the calorie target", () => {
    for (const [current, goal] of [[88, 85], [120, 90], [60, 65], [75, 75]] as const) {
      const targets = recommendTargets(current, goal)!;
      const total = targets.targetProteinG * 4 + targets.targetCarbsG * 4 + targets.targetFatG * 9;
      expect(Math.abs(total - targets.targetCalories)).toBeLessThanOrEqual(10);
    }
  });

  it("stays within what the Goals form accepts", () => {
    for (const [current, goal] of [[20, 20], [500, 500], [500, 20], [20, 500]] as const) {
      const targets = recommendTargets(current, goal)!;
      expect(targets.targetCalories).toBeGreaterThanOrEqual(800);
      expect(targets.targetCarbsG).toBeGreaterThanOrEqual(0);
      expect(targets.targetFatG).toBeLessThanOrEqual(1000);
      expect(targets.targetProteinG).toBeLessThanOrEqual(1000);
    }
  });

  it.each([
    [Number.NaN, 80],
    [80, 0],
    [10, 80],
    [80, 600],
  ])("returns nothing for %s and %s", (current, goal) => {
    expect(recommendTargets(current, goal)).toBeNull();
  });
});
