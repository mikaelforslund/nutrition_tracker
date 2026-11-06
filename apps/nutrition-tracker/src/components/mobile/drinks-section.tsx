"use client";

import { cn } from "@trackerx/ui";
import { Minus, Plus } from "lucide-react";
import { useDrinkCounter } from "@/components/use-drink-counter";
import {
  DRINK_LABELS,
  DRINK_TYPES,
  glassesLabel,
  type DrinkDay,
  type DrinkType,
} from "@/lib/nutrition/drinks";
import { Section } from "./ios";

const STEP_BUTTON =
  "flex h-8 w-11 items-center justify-center text-ios-blue active:bg-ios-separator disabled:text-ios-tertiary";

function DrinkRow({ drinkType, day, glasses }: { drinkType: DrinkType; day: string; glasses: number }) {
  const { shown, failed, change, canAdd, canRemove } = useDrinkCounter({ drinkType, day, glasses });
  const name = DRINK_LABELS[drinkType];

  return (
    <div className="flex min-h-11 items-center gap-3 px-4 py-1.5">
      <span className="flex-1">{name}</span>
      {failed ? (
        <span role="alert" className="text-[13px] text-ios-red">
          Not saved
        </span>
      ) : null}
      <span className={cn("w-6 text-right tabular-nums", shown === 0 && "text-ios-tertiary")}>{shown}</span>
      <div className="flex shrink-0 divide-x divide-ios-separator overflow-hidden rounded-lg bg-ios-fill">
        <button
          type="button"
          aria-label={`Remove a glass of ${name}`}
          disabled={!canRemove}
          onClick={() => change(-1)}
          className={STEP_BUTTON}
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Add a glass of ${name}`}
          disabled={!canAdd}
          onClick={() => change(1)}
          className={STEP_BUTTON}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function DrinksSection({
  today,
  day,
  goal,
}: {
  today: string;
  day: DrinkDay | undefined;
  goal: number;
}) {
  return (
    <Section
      header="Drinks"
      trailing={<span>{day?.total ?? 0} of {glassesLabel(goal)}</span>}
      footer="Add drinks with milk or sugar as a meal too, so their calories count."
    >
      {DRINK_TYPES.map((type) => (
        <DrinkRow key={type} drinkType={type} day={today} glasses={day?.[type] ?? 0} />
      ))}
    </Section>
  );
}
