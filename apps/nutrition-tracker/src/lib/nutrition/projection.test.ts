import { describe, expect, it } from "vitest";
import { projectGoalWeight, type ProjectionInput } from "./projection";

// At 80 kg, estimated maintenance is 2,400 kcal.
const base: ProjectionInput = {
  currentWeightKg: 80,
  goalWeightKg: 79,
  dailyCalories: [1630, 1630, 1630],
  today: "2026-01-01",
};

describe("projectGoalWeight", () => {
  it("projects a date for a deficit when losing weight", () => {
    // 1 kg * 7700 kcal / 770 kcal per day = 10 days.
    expect(projectGoalWeight(base)).toMatchObject({
      status: "on_track",
      daysRemaining: 10,
      targetDate: "January 11, 2026",
    });
  });

  it("estimates maintenance from current weight", () => {
    // 100 kg gives 3,000 kcal, so the same intake is a much larger deficit.
    const projection = projectGoalWeight({
      ...base,
      currentWeightKg: 100,
      goalWeightKg: 99,
      dailyCalories: [2230, 2230, 2230],
    });
    expect(projection).toMatchObject({ status: "on_track", daysRemaining: 10 });
  });

  it("projects a date for a surplus when gaining weight", () => {
    const projection = projectGoalWeight({
      ...base,
      goalWeightKg: 81,
      dailyCalories: [3170, 3170, 3170],
    });
    expect(projection).toMatchObject({ status: "on_track", daysRemaining: 10 });
    expect(projection.message).toContain("surplus");
  });

  it("crosses month and year boundaries", () => {
    expect(projectGoalWeight({ ...base, today: "2026-12-28" })).toMatchObject({
      targetDate: "January 7, 2027",
    });
  });

  it("asks for profile details when a weight is missing", () => {
    for (const missing of ["currentWeightKg", "goalWeightKg"]) {
      expect(projectGoalWeight({ ...base, [missing]: null }).status).toBe("needs_profile");
    }
  });

  it("requires a minimum number of logged days", () => {
    const projection = projectGoalWeight({ ...base, dailyCalories: [1700, 1700] });
    expect(projection).toMatchObject({
      status: "needs_data",
      message: "Log 1 more full day to see a projection.",
    });
  });

  it("reports a reached goal even with no logs", () => {
    expect(projectGoalWeight({ ...base, goalWeightKg: 80, dailyCalories: [] }).status).toBe("reached");
  });

  it("is off track when intake moves away from the goal", () => {
    const projection = projectGoalWeight({ ...base, dailyCalories: [2900, 2900, 2900] });
    expect(projection.status).toBe("off_track");
    expect(projection.message).toContain("above");
  });

  it("is off track when intake equals maintenance", () => {
    const projection = projectGoalWeight({ ...base, dailyCalories: [2400, 2400, 2400] });
    expect(projection.status).toBe("off_track");
    expect(projection.message).toContain("at your");
  });

  it("gives no date when the goal is over ten years away", () => {
    const projection = projectGoalWeight({
      ...base,
      goalWeightKg: 60,
      dailyCalories: [2399, 2399, 2399],
    });
    expect(projection.status).toBe("off_track");
    expect(projection.message).toContain("10 years");
  });
});
