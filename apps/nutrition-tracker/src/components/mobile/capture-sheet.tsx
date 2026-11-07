"use client";

import { Camera, Images, Minus, PencilLine, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { saveFoodLog } from "@/app/actions";
import { caloriesFromMacros } from "@/lib/nutrition/calories";
import {
  EMPTY_MANUAL_MEAL,
  QUANTITY_STEP,
  manualMealToLog,
  parseDecimal,
  type ManualMealDraft,
} from "@/lib/nutrition/manual-meal";
import type { FoodLogInput } from "@/lib/nutrition/schemas";
import { analyzeImage, type MealDraft } from "@/lib/vision/analyze-client";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/vision/contract";

type Stage =
  | { name: "choose" }
  | { name: "analyzing" }
  | { name: "review"; draft: MealDraft }
  | { name: "manual"; draft: ManualMealDraft };

const FIELDS = [
  { key: "proteinG", label: "Protein", unit: "g" },
  { key: "carbsG", label: "Carbs", unit: "g" },
  { key: "fatG", label: "Fat", unit: "g" },
] as const;

function CaloriesRow({ log }: { log: FoodLogInput | null }) {
  const calories = log ? caloriesFromMacros(log.proteinG, log.carbsG, log.fatG) : 0;

  return (
    <div className="flex min-h-11 items-center gap-3 px-4">
      <span className="flex-1 font-medium">Calories</span>
      <output aria-label="Calories" className="w-24 py-2.5 text-right font-medium">
        {calories.toLocaleString("en-US")}
      </output>
      <span className="w-9 text-[15px] text-ios-secondary">kcal</span>
    </div>
  );
}

function ChoiceRow({
  icon,
  label,
  capture,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  capture?: "environment";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  // A label around the input is what reliably opens the picker in iOS Safari.
  return (
    <label className="flex h-14 items-center justify-center gap-2 text-[20px] text-ios-blue active:bg-ios-fill">
      {icon}
      {label}
      <input
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        capture={capture}
        onChange={onChange}
        className="sr-only"
      />
    </label>
  );
}

function ManualForm({
  draft,
  onChange,
}: {
  draft: ManualMealDraft;
  onChange: (change: Partial<ManualMealDraft>) => void;
}) {
  const total = manualMealToLog(draft);
  // The server decides what today is when no day is picked, so this is only the
  // picker's starting point and can't push a meal onto the wrong day by itself.
  const deviceToday = new Date().toLocaleDateString("en-CA");

  return (
    <>
      <div className="mx-4 mt-6 divide-y divide-ios-separator overflow-hidden rounded-[10px] bg-ios-card">
        <label className="flex min-h-11 items-center gap-3 px-4">
          <span className="shrink-0">Item</span>
          <input
            autoFocus
            aria-label="Item"
            value={draft.foodName}
            maxLength={190}
            placeholder="Protein powder"
            onChange={(event) => onChange({ foodName: event.target.value })}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-right outline-none placeholder:text-ios-tertiary"
          />
        </label>
        <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-1.5">
          <span>Quantity</span>
          <div className="flex items-center gap-3">
            <span aria-live="polite" className="min-w-8 text-right text-ios-secondary">
              {draft.quantity}
            </span>
            <div className="flex h-8 items-center overflow-hidden rounded-lg bg-ios-fill">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={draft.quantity <= QUANTITY_STEP}
                onClick={() => onChange({ quantity: draft.quantity - QUANTITY_STEP })}
                className="flex h-full w-11 items-center justify-center active:bg-ios-fill disabled:opacity-30"
              >
                <Minus aria-hidden className="size-4" />
              </button>
              <span aria-hidden className="h-4 w-px bg-ios-separator" />
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => onChange({ quantity: draft.quantity + QUANTITY_STEP })}
                className="flex h-full w-11 items-center justify-center active:bg-ios-fill"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-3 px-4">
          <span className="shrink-0">Date</span>
          <input
            aria-label="Date"
            type="date"
            max={deviceToday}
            value={draft.day ?? deviceToday}
            onChange={(event) => onChange({ day: event.target.value })}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-right text-ios-secondary outline-none"
          />
        </label>
      </div>

      <p className="mx-8 mt-6 pb-1.5 text-[13px] text-ios-secondary uppercase">Per Serving</p>
      <div className="mx-4 divide-y divide-ios-separator overflow-hidden rounded-[10px] bg-ios-card">
        {FIELDS.map(({ key, label, unit }) => (
          <label key={key} className="flex min-h-11 items-center gap-3 px-4">
            <span className="flex-1">{label}</span>
            <input
              inputMode="decimal"
              aria-label={label}
              value={draft[key]}
              placeholder="0"
              onChange={(event) => onChange({ [key]: event.target.value })}
              className="w-24 bg-transparent py-2.5 text-right text-ios-secondary outline-none placeholder:text-ios-tertiary"
            />
            <span className="w-9 text-[15px] text-ios-secondary">{unit}</span>
          </label>
        ))}
      </div>

      <p className="mx-8 mt-6 pb-1.5 text-[13px] text-ios-secondary uppercase">Total</p>
      <div className="mx-4 overflow-hidden rounded-[10px] bg-ios-card">
        <CaloriesRow log={total} />
      </div>
      <p className="mx-8 mt-2 text-[13px] text-ios-secondary">
        {total
          ? `${total.proteinG} g protein, ${total.carbsG} g carbs, ${total.fatG} g fat`
          : "Calories are calculated from the macros."}
      </p>
    </>
  );
}

function Alert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex animate-ios-fade items-center justify-center bg-black/40 px-12">
      <div role="alertdialog" aria-label="Couldn't add meal" className="w-full max-w-[270px] overflow-hidden rounded-[14px] bg-ios-card text-center">
        <div className="px-4 pt-5 pb-4">
          <p className="font-semibold">Couldn&apos;t Add Meal</p>
          <p className="mt-1 text-[13px]">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-11 w-full border-t border-ios-separator font-semibold text-ios-blue active:bg-ios-fill"
        >
          OK
        </button>
      </div>
    </div>
  );
}

export function CaptureSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "choose" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setError("That photo is over the 8 MB limit.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setStage({ name: "analyzing" });

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      setStage({ name: "review", draft: await analyzeImage(file, controller.signal) });
    } catch (cause) {
      if (controller.signal.aborted) return;
      setStage({ name: "choose" });
      setPreviewUrl(null);
      setError(cause instanceof Error ? cause.message : "The photo couldn't be analyzed.");
    }
  }

  function updateDraft(change: Partial<MealDraft>) {
    setStage((current) =>
      current.name === "review" ? { ...current, draft: { ...current.draft, ...change } } : current,
    );
  }

  function updateManual(change: Partial<ManualMealDraft>) {
    setStage((current) =>
      current.name === "manual" ? { ...current, draft: { ...current.draft, ...change } } : current,
    );
  }

  function photoMealToLog(draft: MealDraft): FoodLogInput {
    return {
      foodName: draft.foodName,
      proteinG: parseDecimal(draft.proteinG),
      carbsG: parseDecimal(draft.carbsG),
      fatG: parseDecimal(draft.fatG),
      imageUrl: draft.imageUrl,
    };
  }

  function save(log: FoodLogInput) {
    startSaving(async () => {
      const result = await saveFoodLog(log).catch(() => null);

      if (result?.status === "saved") {
        onClose();
        router.push("/m");
      } else {
        setError(result?.message ?? "The meal couldn't be saved. Try again.");
      }
    });
  }

  const alert = error ? <Alert message={error} onClose={() => setError(null)} /> : null;

  if (stage.name === "choose") {
    return (
      <div className="fixed inset-0 z-40 flex animate-ios-fade flex-col justify-end bg-black/40 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <button type="button" aria-label="Dismiss" onClick={onClose} className="flex-1" />
        <div className="animate-ios-sheet">
          <div className="divide-y divide-ios-separator overflow-hidden rounded-[14px] bg-ios-card">
            <ChoiceRow
              icon={<Camera aria-hidden className="size-5" />}
              label="Take Photo"
              capture="environment"
              onChange={handleFile}
            />
            <ChoiceRow
              icon={<Images aria-hidden className="size-5" />}
              label="Choose from Library"
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => setStage({ name: "manual", draft: EMPTY_MANUAL_MEAL })}
              className="flex h-14 w-full items-center justify-center gap-2 text-[20px] text-ios-blue active:bg-ios-fill"
            >
              <PencilLine aria-hidden className="size-5" />
              Enter Manually
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 h-14 w-full rounded-[14px] bg-ios-card text-[20px] font-semibold text-ios-blue active:bg-ios-fill"
          >
            Cancel
          </button>
        </div>
        {alert}
      </div>
    );
  }

  const draft = stage.name === "review" ? stage.draft : null;
  const manual = stage.name === "manual" ? stage.draft : null;
  const log = manual ? manualMealToLog(manual) : draft?.foodName.trim() ? photoMealToLog(draft) : null;

  return (
    <div className="fixed inset-0 z-40 animate-ios-fade bg-black/40 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div
        role="dialog"
        aria-label="New meal"
        className="flex h-full animate-ios-sheet flex-col overflow-hidden rounded-t-[12px] bg-ios-bg"
      >
        <header className="grid h-14 shrink-0 grid-cols-3 items-center border-b border-ios-separator bg-ios-bar px-4 backdrop-blur-xl">
          <button type="button" onClick={onClose} className="justify-self-start text-ios-blue">
            Cancel
          </button>
          <h2 className="text-center font-semibold">New Meal</h2>
          <button
            type="button"
            disabled={!log || isSaving}
            onClick={() => log && save(log)}
            className="justify-self-end font-semibold text-ios-blue disabled:text-ios-tertiary"
          >
            {isSaving ? "Saving" : "Save"}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          {previewUrl ? (
            <img src={previewUrl} alt="Your meal" className="aspect-[4/3] w-full object-cover" />
          ) : null}

          {stage.name === "analyzing" ? (
            <p role="status" className="flex items-center justify-center gap-2 p-8 text-ios-secondary">
              <span
                aria-hidden
                className="size-5 animate-spin rounded-full border-2 border-ios-tertiary border-t-transparent"
              />
              Analyzing Photo…
            </p>
          ) : null}

          {manual ? <ManualForm draft={manual} onChange={updateManual} /> : null}

          {draft ? (
            <>
              <div className="mx-4 mt-6 overflow-hidden rounded-[10px] bg-ios-card">
                <label className="flex min-h-11 items-center gap-3 px-4">
                  <span className="shrink-0">Meal</span>
                  <input
                    value={draft.foodName}
                    maxLength={200}
                    onChange={(event) => updateDraft({ foodName: event.target.value })}
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-right text-ios-secondary outline-none"
                  />
                </label>
              </div>
              <div className="mx-4 mt-6 divide-y divide-ios-separator overflow-hidden rounded-[10px] bg-ios-card">
                {FIELDS.map(({ key, label, unit }) => (
                  <label key={key} className="flex min-h-11 items-center gap-3 px-4">
                    <span className="flex-1">{label}</span>
                    <input
                      inputMode="decimal"
                      aria-label={label}
                      value={draft[key]}
                      onChange={(event) => updateDraft({ [key]: event.target.value })}
                      className="w-24 bg-transparent py-2.5 text-right text-ios-secondary outline-none"
                    />
                    <span className="w-9 text-[15px] text-ios-secondary">{unit}</span>
                  </label>
                ))}
                <CaloriesRow log={log} />
              </div>
              <p className="mx-8 mt-2 text-[13px] text-ios-secondary">
                These are estimates from your photo. Calories are calculated from the macros.
              </p>
            </>
          ) : null}
        </div>
      </div>
      {alert}
    </div>
  );
}
