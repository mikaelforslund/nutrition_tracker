"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dropzone,
  Field,
  Input,
  StatusLabel,
} from "@trackerx/ui";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { saveFoodLog } from "@/app/actions";
import { caloriesFromMacros } from "@/lib/nutrition/calories";
import { analyzeImage, type MealDraft as Draft } from "@/lib/vision/analyze-client";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/vision/contract";

type Stage = { name: "idle" } | { name: "analyzing" } | { name: "review"; draft: Draft };

const MACRO_FIELDS = [
  { key: "proteinG", label: "Protein (g)", step: "0.1" },
  { key: "carbsG", label: "Carbs (g)", step: "0.1" },
  { key: "fatG", label: "Fat (g)", step: "0.1" },
] as const;

export function FoodCapture({ asUserId }: { asUserId?: string }) {
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => () => requestRef.current?.abort(), []);

  function reset() {
    requestRef.current?.abort();
    setPreviewUrl(null);
    setStage({ name: "idle" });
  }

  async function handleFile(file: File) {
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setStage({ name: "analyzing" });

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const draft = await analyzeImage(file, controller.signal, asUserId);
      setStage({ name: "review", draft });
    } catch (cause) {
      if (controller.signal.aborted) return;
      reset();
      setError(cause instanceof Error ? cause.message : "The image couldn't be analyzed.");
    }
  }

  function updateDraft(change: Partial<Draft>) {
    setStage((current) =>
      current.name === "review" ? { ...current, draft: { ...current.draft, ...change } } : current,
    );
  }

  function handleSave(event: FormEvent, draft: Draft) {
    event.preventDefault();
    setError(null);

    startSaving(async () => {
      try {
        const result = await saveFoodLog(
          {
            foodName: draft.foodName,
            proteinG: Number(draft.proteinG),
            carbsG: Number(draft.carbsG),
            fatG: Number(draft.fatG),
            imageUrl: draft.imageUrl,
          },
          asUserId,
        );
        if (result.status === "saved") {
          reset();
        } else {
          setError(result.message ?? "The meal couldn't be saved.");
        }
      } catch {
        setError("The meal couldn't be saved. Try again.");
      }
    });
  }

  return (
    <Card className="h-full">
      <CardHeader className="p-3.5 pb-0">
        <CardTitle>Log a meal</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-3.5 pt-2">
        {stage.name === "idle" ? (
          <Dropzone
            accept={ACCEPTED_IMAGE_TYPES}
            maxBytes={MAX_IMAGE_BYTES}
            onFile={handleFile}
            onReject={setError}
            title="Drop a food photo, or click to browse"
            hint="Paste with ⌘V or ⌘-click. JPEG, PNG, or WebP up to 8 MB"
            allowPaste
            className="gap-1 py-3"
          />
        ) : null}

        {stage.name !== "idle" && previewUrl ? (
          <img src={previewUrl} alt="Your meal" className="h-40 w-full rounded-lg object-cover" />
        ) : null}

        {stage.name === "analyzing" ? (
          <div className="flex items-center justify-between gap-3">
            <p role="status" className="flex items-center gap-2 text-sm text-zinc-600">
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
              Analyzing your photo
            </p>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        ) : null}

        {stage.name === "review" ? (
          <form onSubmit={(event) => handleSave(event, stage.draft)} className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500">
              {Math.round(stage.draft.confidence * 100)}% confidence
            </p>
            <Field label="Meal">
              <Input
                required
                maxLength={200}
                value={stage.draft.foodName}
                onChange={(event) => updateDraft({ foodName: event.target.value })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              {MACRO_FIELDS.map(({ key, label, step }) => (
                <Field key={key} label={label}>
                  <Input
                    required
                    type="number"
                    min="0"
                    step={step}
                    value={stage.draft[key]}
                    onChange={(event) => updateDraft({ [key]: event.target.value })}
                  />
                </Field>
              ))}
            </div>
            <p className="text-sm text-zinc-600">
              Calories:{" "}
              <span className="font-medium text-zinc-950">
                {caloriesFromMacros(
                  Number(stage.draft.proteinG),
                  Number(stage.draft.carbsG),
                  Number(stage.draft.fatG),
                ).toLocaleString("en-US")}{" "}
                kcal
              </span>
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving" : "Save meal"}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={isSaving}>
                Discard
              </Button>
            </div>
          </form>
        ) : null}

        {error ? (
          <p role="alert">
            <StatusLabel tone="critical">{error}</StatusLabel>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
