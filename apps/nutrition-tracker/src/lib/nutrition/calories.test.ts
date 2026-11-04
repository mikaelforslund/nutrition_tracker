import { describe, expect, it } from "vitest";
import { caloriesFromMacros } from "./calories";

describe("caloriesFromMacros", () => {
  it("uses 4, 4, and 9 kcal per gram", () => {
    expect(caloriesFromMacros(25, 35, 20)).toBe(420);
  });

  it("rounds to a whole number", () => {
    expect(caloriesFromMacros(0.5, 13.5, 0)).toBe(56);
    expect(caloriesFromMacros(0, 0, 1.5)).toBe(14);
  });
});
