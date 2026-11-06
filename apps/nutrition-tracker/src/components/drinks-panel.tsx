"use client";

import { cn } from "@trackerx/ui";
import { Minus, Plus } from "lucide-react";
import { useDrinkCounter } from "@/components/use-drink-counter";
import {
  DRINK_LABELS,
  DRINK_TYPES,
  editableDrinkDays,
  type DrinkLog,
  type DrinkType,
} from "@/lib/nutrition/drinks";

const STEP_BUTTON =
  "rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30 disabled:hover:bg-transparent";

const longDate = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function Stepper({
  drinkType,
  day,
  dayLabel,
  glasses,
  asUserId,
}: {
  drinkType: DrinkType;
  day: string;
  dayLabel: string;
  glasses: number;
  asUserId?: string;
}) {
  const { shown, failed, change, canAdd, canRemove } = useDrinkCounter({ drinkType, day, glasses, asUserId });
  const name = `${DRINK_LABELS[drinkType].toLowerCase()} on ${dayLabel}`;

  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        aria-label={`Remove a glass of ${name}`}
        disabled={!canRemove}
        onClick={() => change(-1)}
        className={STEP_BUTTON}
      >
        <Minus aria-hidden className="size-3.5" />
      </button>
      <span
        title={failed ? "Couldn't save. Try again" : undefined}
        className={cn(
          "w-6 text-center tabular-nums",
          shown === 0 && "text-zinc-400",
          failed && "text-status-critical-ink",
        )}
      >
        {shown}
      </span>
      <button
        type="button"
        aria-label={`Add a glass of ${name}`}
        disabled={!canAdd}
        onClick={() => change(1)}
        className={STEP_BUTTON}
      >
        <Plus aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}

export function DrinksPanel({
  drinks,
  today,
  asUserId,
}: {
  drinks: DrinkLog[];
  today: string;
  asUserId?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Drinks list"
      className="max-h-[28rem] overflow-y-auto focus-visible:outline-2 focus-visible:outline-accent"
    >
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-white text-xs text-zinc-500">
          <tr>
            <th scope="col" className="border-b border-zinc-200 py-2 pr-2 text-left font-medium">Date</th>
            {DRINK_TYPES.map((type) => (
              <th key={type} scope="col" className="border-b border-zinc-200 px-2 py-2 text-right font-medium">
                {DRINK_LABELS[type]}
              </th>
            ))}
            <th scope="col" className="border-b border-zinc-200 py-2 pl-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {editableDrinkDays(drinks, today).map((entry) => {
            const dayLabel = entry.day === today ? "Today" : longDate(entry.day);
            return (
              <tr key={entry.day}>
                <td className="border-b border-zinc-100 py-1 pr-2 whitespace-nowrap text-zinc-600">{dayLabel}</td>
                {DRINK_TYPES.map((type) => (
                  <td key={type} className="border-b border-zinc-100 px-2 py-1">
                    <Stepper
                      drinkType={type}
                      day={entry.day}
                      dayLabel={dayLabel}
                      glasses={entry[type]}
                      asUserId={asUserId}
                    />
                  </td>
                ))}
                <td className="border-b border-zinc-100 py-1 pl-2 text-right font-medium text-zinc-900 tabular-nums">
                  {entry.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
