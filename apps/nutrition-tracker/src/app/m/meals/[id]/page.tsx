import { notFound } from "next/navigation";
import { z } from "zod";
import { AddToToday } from "@/components/mobile/add-to-today";
import { BackButton } from "@/components/mobile/back-button";
import { Row, Section } from "@/components/mobile/ios";
import { requireMobileUser } from "@/lib/mobile-session";
import { getMealView } from "@/lib/nutrition/repository";

export const dynamic = "force-dynamic";

export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser();
  const { id } = await params;
  const view = z.uuid().safeParse(id).success ? await getMealView(user.id, id) : null;
  if (!view) notFound();

  const { meal, dayLabel, today } = view;

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <nav className="sticky top-0 z-20 flex h-11 items-center border-b border-ios-separator bg-ios-bar px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl box-content">
        <BackButton />
      </nav>

      {meal.imageUrl ? (
        <img src={meal.imageUrl} alt={meal.foodName} className="aspect-[4/3] w-full object-cover" />
      ) : null}

      <header className="px-4 pt-4">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">{meal.foodName}</h1>
        <p className="text-ios-secondary">
          {dayLabel}, {meal.time}
        </p>
      </header>

      <Section header="Nutrition">
        <Row label="Calories" value={`${meal.calories.toLocaleString("en-US")} kcal`} />
        <Row label="Protein" value={`${meal.proteinG} g`} />
        <Row label="Carbs" value={`${meal.carbsG} g`} />
        <Row label="Fat" value={`${meal.fatG} g`} />
      </Section>

      {meal.notes ? (
        <Section header="Notes">
          <p className="px-4 py-2.5">{meal.notes}</p>
        </Section>
      ) : null}

      <Section>
        <AddToToday mealId={meal.id} today={today} />
      </Section>
    </div>
  );
}
