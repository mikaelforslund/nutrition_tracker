"use client";

import { Button, Card, CardContent, Field, Input, Select, StatusLabel } from "@trackerx/ui";
import { useActionState, useState } from "react";
import { saveProfile, type ActionResult } from "@/app/actions";
import type { Profile } from "@/lib/nutrition/repository";
import { recommendTargets } from "@/lib/nutrition/targets";

const INITIAL: ActionResult = { status: "idle" };

const TARGET_FIELDS = [
  { name: "targetCalories", label: "Daily calories (kcal)", min: "800", max: "10000" },
  { name: "targetProteinG", label: "Protein (g)", min: "0", max: "1000" },
  { name: "targetCarbsG", label: "Carbs (g)", min: "0", max: "2000" },
  { name: "targetFatG", label: "Fat (g)", min: "0", max: "1000" },
] as const;

type TargetName = (typeof TARGET_FIELDS)[number]["name"];

export function SettingsForm({
  profile,
  timezones,
  asUserId,
}: {
  profile: Profile;
  timezones: string[];
  asUserId?: string;
}) {
  const [result, action, isPending] = useActionState(saveProfile.bind(null, asUserId), INITIAL);
  const [currentWeight, setCurrentWeight] = useState(String(profile.currentWeightKg ?? ""));
  const [goalWeight, setGoalWeight] = useState(String(profile.goalWeightKg ?? ""));
  const [targets, setTargets] = useState<Record<TargetName, string>>({
    targetCalories: String(profile.targetCalories),
    targetProteinG: String(profile.targetProteinG),
    targetCarbsG: String(profile.targetCarbsG),
    targetFatG: String(profile.targetFatG),
  });
  const [calculated, setCalculated] = useState(false);

  /** Weights drive the targets. Editing a target afterwards keeps that edit. */
  function applyWeights(current: string, goal: string) {
    setCurrentWeight(current);
    setGoalWeight(goal);

    const recommended = recommendTargets(Number(current), Number(goal));
    if (!recommended) return;

    setTargets({
      targetCalories: String(recommended.targetCalories),
      targetProteinG: String(recommended.targetProteinG),
      targetCarbsG: String(recommended.targetCarbsG),
      targetFatG: String(recommended.targetFatG),
    });
    setCalculated(true);
  }

  const canCalculate = recommendTargets(Number(currentWeight), Number(goalWeight)) !== null;

  return (
    <Card>
      <CardContent>
        <form action={action} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current weight (kg)">
              <Input
                name="currentWeightKg"
                type="number"
                step="0.1"
                min="20"
                max="500"
                value={currentWeight}
                onChange={(event) => applyWeights(event.target.value, goalWeight)}
              />
            </Field>
            <Field label="Goal weight (kg)">
              <Input
                name="goalWeightKg"
                type="number"
                step="0.1"
                min="20"
                max="500"
                value={goalWeight}
                onChange={(event) => applyWeights(currentWeight, event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">Daily targets</p>
                <p className="text-xs text-zinc-500">
                  {calculated
                    ? "Calculated from your weights. Adjust them if you'd like, then save."
                    : "Enter your weights to calculate these, or set them yourself."}
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={!canCalculate}
                onClick={() => applyWeights(currentWeight, goalWeight)}
                className="h-8 shrink-0 px-2.5 text-xs"
              >
                Calculate from weights
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {TARGET_FIELDS.map(({ name, label, min, max }) => (
                <Field key={name} label={label}>
                  <Input
                    name={name}
                    type="number"
                    required
                    min={min}
                    max={max}
                    value={targets[name]}
                    onChange={(event) =>
                      setTargets((current) => ({ ...current, [name]: event.target.value }))
                    }
                  />
                </Field>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Rule-of-thumb estimates: about 30 kcal per kg to maintain, 500 kcal less a day to lose
              or 300 more to gain, never under 1,200 kcal. Protein is 1.8 g per kg of goal weight,
              fat is 25% of calories, and carbs are the rest. This isn&apos;t medical advice.
            </p>
          </div>

          <Field label="Timezone" hint="Decides when your day starts">
            <Select name="timezone" defaultValue={profile.timezone}>
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving" : "Save goals"}
            </Button>
            <span role="status">
              {result.status === "saved" ? <StatusLabel tone="good">{result.message}</StatusLabel> : null}
              {result.status === "error" ? <StatusLabel tone="critical">{result.message}</StatusLabel> : null}
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
