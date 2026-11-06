import { CalorieRing, MacroBar } from "@/components/mobile/calorie-ring";
import { DrinksSection } from "@/components/mobile/drinks-section";
import { LargeTitle, Section } from "@/components/mobile/ios";
import { MealCell } from "@/components/mobile/meal-cell";
import { WeightRow } from "@/components/mobile/weight-row";
import { WorkoutsSection } from "@/components/mobile/workouts-section";
import { requireMobileUser } from "@/lib/mobile-session";
import { drinkDays } from "@/lib/nutrition/drinks";
import { groupLogsByDay } from "@/lib/nutrition/group-logs";
import { getDashboardData } from "@/lib/nutrition/repository";
import { burnedByDay } from "@/lib/nutrition/workouts";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await requireMobileUser();
  const { profile, today, todayTotals, recentLogs, weights, workouts, drinks } = await getDashboardData(
    user.id,
  );

  const burned = burnedByDay(workouts);
  const burnedToday = burned.get(today) ?? 0;
  const groups = groupLogsByDay(recentLogs, today, profile.timezone, profile.targetCalories, burned);
  const todayMeals = groups.find((group) => group.day === today)?.meals ?? [];

  const subtitle = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <LargeTitle title="Today" subtitle={subtitle} />

      <div className="mx-4 mt-2 flex items-center gap-5 rounded-[10px] bg-ios-card p-4">
        <CalorieRing eaten={todayTotals.calories - burnedToday} target={profile.targetCalories} />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <MacroBar label="Protein" eaten={todayTotals.proteinG} target={profile.targetProteinG} />
          <MacroBar label="Carbs" eaten={todayTotals.carbsG} target={profile.targetCarbsG} />
          <MacroBar label="Fat" eaten={todayTotals.fatG} target={profile.targetFatG} />
        </div>
      </div>

      <Section>
        <WeightRow latest={weights[weights.length - 1]?.value ?? null} />
      </Section>

      <DrinksSection
        today={today}
        day={drinkDays(drinks).find((entry) => entry.day === today)}
        goal={profile.targetGlasses}
      />

      <WorkoutsSection workouts={workouts.filter((workout) => workout.day === today)} today={today} />

      {todayMeals.length > 0 ? (
        <Section header="Meals">
          {todayMeals.map((meal) => (
            <MealCell key={meal.id} meal={meal} />
          ))}
        </Section>
      ) : (
        <p className="px-8 pt-12 text-center text-ios-secondary">
          No meals yet today. Tap Add Meal to log your first one.
        </p>
      )}
    </>
  );
}
