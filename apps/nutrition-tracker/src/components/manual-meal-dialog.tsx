"use client";

import { Button, Dialog, Field, Input, StatusLabel } from "@trackerx/ui";
import { Minus, Plus } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { saveFoodLog } from "@/app/actions";
import { caloriesFromMacros } from "@/lib/nutrition/calories";
import {
  EMPTY_MANUAL_MEAL,
  QUANTITY_STEP,
  manualMealToLog,
  type ManualMealDraft,
} from "@/lib/nutrition/manual-meal";

const MACRO_FIELDS = [
  { key: "proteinG", label: "Protein (g)" },
  { key: "carbsG", label: "Carbs (g)" },
  { key: "fatG", label: "Fat (g)" },
] as const;

export function ManualMealDialog({
  asUserId,
  today,
  onClose,
}: {
  asUserId?: string;
  today: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ManualMealDraft>(EMPTY_MANUAL_MEAL);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const log = manualMealToLog(draft);
  const calories = log ? caloriesFromMacros(log.proteinG, log.carbsG, log.fatG) : 0;

  function update(change: Partial<ManualMealDraft>) {
    setDraft((current) => ({ ...current, ...change }));
    setError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!log) return;

    startSaving(async () => {
      const result = await saveFoodLog(log, asUserId).catch(() => null);
      if (result?.status === "saved") {
        onClose();
      } else {
        setError(result?.message ?? "The meal couldn't be saved.");
      }
    });
  }

  return (
    <Dialog open onClose={onClose} title="Enter meal" description="Values are per serving.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field label="Item">
            <Input
              autoFocus
              required
              maxLength={190}
              placeholder="Protein powder"
              value={draft.foodName}
              onChange={(event) => update({ foodName: event.target.value })}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Quantity</span>
            <div className="flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-1">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={draft.quantity <= QUANTITY_STEP}
                onClick={() => update({ quantity: draft.quantity - QUANTITY_STEP })}
                className="rounded p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
              >
                <Minus aria-hidden className="size-3.5" />
              </button>
              <span aria-live="polite" className="w-7 text-center text-sm tabular-nums">
                {draft.quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => update({ quantity: draft.quantity + QUANTITY_STEP })}
                className="rounded p-1 text-zinc-600 hover:bg-zinc-100"
              >
                <Plus aria-hidden className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {MACRO_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <Input
                inputMode="decimal"
                placeholder="0"
                value={draft[key]}
                onChange={(event) => update({ [key]: event.target.value })}
              />
            </Field>
          ))}
        </div>

        <Field label="Date">
          <Input
            type="date"
            required
            max={today}
            value={draft.day ?? today}
            onChange={(event) => update({ day: event.target.value })}
          />
        </Field>

        <p className="text-sm text-zinc-600">
          Total calories:{" "}
          <output className="font-medium text-zinc-950">{calories.toLocaleString("en-US")} kcal</output>
        </p>

        {error ? (
          <p role="alert">
            <StatusLabel tone="critical">{error}</StatusLabel>
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={!log || isSaving}>
            {isSaving ? "Saving" : "Save meal"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
