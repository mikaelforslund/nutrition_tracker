"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { updateFoodLog, type ActionResult } from "@/app/actions";
import type { DayGroup } from "@/lib/nutrition/group-logs";

type Meal = DayGroup["meals"][number];

const INITIAL: ActionResult = { status: "idle" };
const ROW = "flex min-h-11 items-center gap-3 px-4";
const ROW_INPUT = "min-w-0 flex-1 bg-transparent py-2.5 text-right text-ios-secondary outline-none placeholder:text-ios-tertiary";

const MACRO_FIELDS = [
  { name: "proteinG", label: "Protein" },
  { name: "carbsG", label: "Carbs" },
  { name: "fatG", label: "Fat" },
] as const;

function MealEditSheet({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const [result, action, isPending] = useActionState(updateFoodLog.bind(null, meal.id, undefined), INITIAL);

  useEffect(() => {
    if (result.status === "saved") onClose();
  }, [result, onClose]);

  return (
    <div className="fixed inset-0 z-40 animate-ios-fade bg-black/40 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <form
        action={action}
        role="dialog"
        aria-label="Edit meal"
        className="flex h-full animate-ios-sheet flex-col overflow-hidden rounded-t-[12px] bg-ios-bg"
      >
        <header className="grid h-14 shrink-0 grid-cols-3 items-center border-b border-ios-separator bg-ios-bar px-4 backdrop-blur-xl">
          <button type="button" onClick={onClose} className="justify-self-start text-ios-blue">
            Cancel
          </button>
          <h2 className="text-center font-semibold">Edit Meal</h2>
          <button
            type="submit"
            disabled={isPending}
            className="justify-self-end font-semibold text-ios-blue disabled:text-ios-tertiary"
          >
            {isPending ? "Saving" : "Save"}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <div className="mx-4 mt-6 divide-y divide-ios-separator overflow-hidden rounded-[10px] bg-ios-card">
            <label className={ROW}>
              <span className="shrink-0">Meal</span>
              <input
                name="foodName"
                aria-label="Meal"
                required
                maxLength={200}
                defaultValue={meal.foodName}
                className={ROW_INPUT}
              />
            </label>
            {MACRO_FIELDS.map(({ name, label }) => (
              <label key={name} className={ROW}>
                <span className="shrink-0">{label}</span>
                <input
                  name={name}
                  aria-label={`${label} in grams`}
                  type="number"
                  inputMode="decimal"
                  required
                  min="0"
                  max="2000"
                  step="any"
                  defaultValue={meal[name]}
                  className={ROW_INPUT}
                />
                <span className="text-ios-secondary">g</span>
              </label>
            ))}
            <label className={ROW}>
              <span className="shrink-0">Eaten At</span>
              <input
                name="loggedAt"
                aria-label="Eaten at"
                type="datetime-local"
                required
                defaultValue={meal.loggedAtLocal}
                className={ROW_INPUT}
              />
            </label>
          </div>
          <p className="mx-8 mt-2 text-[13px] text-ios-secondary">
            Calories are calculated from these when you save.
          </p>

          <div className="mx-4 mt-6 overflow-hidden rounded-[10px] bg-ios-card">
            <textarea
              name="notes"
              aria-label="Notes"
              rows={4}
              maxLength={2000}
              defaultValue={meal.notes ?? ""}
              placeholder="Notes, like sauces, drinks, or portion size"
              className="block w-full resize-none bg-transparent px-4 py-2.5 outline-none placeholder:text-ios-tertiary"
            />
          </div>

          {result.status === "error" ? (
            <p role="alert" className="mx-8 mt-2 text-[13px] text-ios-red">
              {result.message}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export function EditMealButton({ meal }: { meal: Meal }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setEditing(true)} className="text-ios-blue active:opacity-50">
        Edit
      </button>
      {/* The blurred nav bar would otherwise confine this full-screen sheet to its own size. */}
      {editing
        ? createPortal(
            <MealEditSheet meal={meal} onClose={() => setEditing(false)} />,
            document.querySelector(".ios-app") ?? document.body,
          )
        : null}
    </>
  );
}
