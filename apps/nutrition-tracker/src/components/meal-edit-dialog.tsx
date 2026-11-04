"use client";

import { Button, Dialog, Field, Input, StatusLabel, Textarea } from "@trackerx/ui";
import { useActionState, useEffect } from "react";
import { updateFoodLog, type ActionResult } from "@/app/actions";
import type { DayGroup } from "@/lib/nutrition/group-logs";

const INITIAL: ActionResult = { status: "idle" };

const MACRO_FIELDS = [
  { name: "proteinG", label: "Protein (g)", step: "0.1", key: "proteinG" },
  { name: "carbsG", label: "Carbs (g)", step: "0.1", key: "carbsG" },
  { name: "fatG", label: "Fat (g)", step: "0.1", key: "fatG" },
] as const;

export function MealEditDialog({
  meal,
  asUserId,
  onClose,
}: {
  meal: DayGroup["meals"][number];
  asUserId?: string;
  onClose: () => void;
}) {
  const [result, action, isPending] = useActionState(
    updateFoodLog.bind(null, meal.id, asUserId),
    INITIAL,
  );

  useEffect(() => {
    if (result.status === "saved") onClose();
  }, [result, onClose]);

  return (
    <Dialog open onClose={onClose} title="Edit meal" description={meal.foodName}>
      <form action={action} className="flex flex-col gap-4">
        {meal.imageUrl ? (
          <img src={meal.imageUrl} alt="" className="h-36 w-full rounded-lg object-cover" />
        ) : null}
        <Field label="Meal">
          <Input name="foodName" required maxLength={200} defaultValue={meal.foodName} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          {MACRO_FIELDS.map(({ name, label, step, key }) => (
            <Field key={name} label={label}>
              <Input name={name} type="number" required min="0" step={step} defaultValue={meal[key]} />
            </Field>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Calories are calculated from these when you save.</p>
        <Field label="Eaten at">
          <Input name="loggedAt" type="datetime-local" required defaultValue={meal.loggedAtLocal} />
        </Field>
        <Field label="Notes">
          <Textarea
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={meal.notes ?? ""}
            placeholder="Anything the photo didn't show, like sauces, drinks, or portion size"
          />
        </Field>
        {result.status === "error" ? (
          <p role="alert">
            <StatusLabel tone="critical">{result.message}</StatusLabel>
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving" : "Save changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
