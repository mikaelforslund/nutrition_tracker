"use client";

import { Button, Card, CardContent, CardDescription, cn } from "@trackerx/ui";
import { ChevronRight, ClipboardPaste, Copy, Pencil, Trash2, Trophy, Utensils, X } from "lucide-react";
import { useCallback, useState, useTransition, type ReactNode } from "react";
import { deleteFoodLogs, pasteFoodLog } from "@/app/actions";
import { MealEditDialog } from "@/components/meal-edit-dialog";
import { useCopiedMeal, type CopiedMeal } from "@/components/use-copied-meal";
import type { DayGroup } from "@/lib/nutrition/group-logs";

const NUMERIC_CELL = "px-2 py-2.5 text-right whitespace-nowrap tabular-nums";
// Macros give way on narrow screens so calories stay visible without scrolling.
const MACRO_CELL = `${NUMERIC_CELL} hidden sm:table-cell`;
const MACRO_HEADER = "hidden px-2 py-2 text-right font-medium sm:table-cell";
// Below this width there's no room for a column, so notes sit under the meal name.
const NOTES_COLUMN = "hidden lg:table-cell";

const TROPHY_FILL_SCORE = 90;
const YELLOW_HUE = 45;
const GREEN_HUE = 135;

function GoalBadge({ group }: { group: DayGroup }) {
  const { goalScore } = group;
  // Maps the 25-100 score onto yellow through green.
  const hue = YELLOW_HUE + ((goalScore - 25) / 75) * (GREEN_HUE - YELLOW_HUE);
  const color = `hsl(${hue} 85% 38%)`;

  return (
    <span
      title={`${goalScore}% of the way to your calorie target, after workouts`}
      className="inline-flex items-center justify-end gap-1.5 font-medium tabular-nums text-zinc-900"
    >
      <Trophy
        aria-hidden
        className="size-4 shrink-0"
        style={{ color }}
        fill={goalScore >= TROPHY_FILL_SCORE ? "currentColor" : "none"}
      />
      {goalScore}%
    </span>
  );
}

function DeleteControl({
  ids,
  name,
  asUserId,
  confirmDetail,
}: {
  ids: string[];
  name: string;
  asUserId?: string;
  /** Extra confirmation text, dropped on narrow screens to keep the table in view. */
  confirmDetail?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete() {
    setFailed(false);
    startDeleting(async () => {
      const result = await deleteFoodLogs(ids, asUserId).catch(() => null);
      if (result?.status !== "saved") {
        setFailed(true);
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        aria-label={failed ? `Couldn't delete ${name}. Try again` : `Delete ${name}`}
        title={failed ? "Couldn't delete. Try again" : "Delete"}
        onClick={() => setConfirming(true)}
        className={cn(
          "rounded-md p-1.5 hover:bg-zinc-100 hover:text-status-critical-ink",
          "focus-visible:outline-2 focus-visible:outline-accent",
          failed ? "text-status-critical-ink" : "text-zinc-400",
        )}
      >
        <Trash2 aria-hidden className="size-4" />
      </button>
    );
  }

  return (
    <span className="flex flex-col items-end gap-0.5 text-xs font-medium whitespace-nowrap">
      <button
        type="button"
        autoFocus
        disabled={isDeleting}
        onClick={handleDelete}
        className="text-status-critical-ink hover:underline disabled:opacity-50"
      >
        {isDeleting ? "Deleting" : "Delete"}
        {confirmDetail ? <span className="hidden sm:inline"> {confirmDetail}</span> : null}
      </button>
      <button
        type="button"
        disabled={isDeleting}
        onClick={() => setConfirming(false)}
        className="text-zinc-500 hover:underline disabled:opacity-50"
      >
        Keep
      </button>
    </span>
  );
}

const ROW_ICON =
  "rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50";

function DayRows({
  group,
  expanded,
  onToggle,
  onEdit,
  asUserId,
  copied,
  onCopy,
  onPaste,
  isPasting,
}: {
  group: DayGroup;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (meal: DayGroup["meals"][number]) => void;
  asUserId?: string;
  copied: CopiedMeal | null;
  onCopy: (meal: CopiedMeal) => void;
  onPaste: (day: string) => void;
  isPasting: boolean;
}) {
  const count = `${group.meals.length} ${group.meals.length === 1 ? "meal" : "meals"}`;

  return (
    <tbody className="border-b border-zinc-100">
      <tr className="bg-zinc-50/70">
        <th scope="rowgroup" className="py-1 pr-2 text-left font-normal">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className="flex w-full items-center gap-1.5 rounded-md py-1 text-left focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ChevronRight
              aria-hidden
              className={cn("size-4 text-zinc-400 transition-transform", expanded && "rotate-90")}
            />
            <span className="font-medium text-zinc-900">{group.label}</span>
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {count}
              {group.burned > 0 ? `, ${group.burned.toLocaleString("en-US")} kcal burned` : ""}
            </span>
          </button>
        </th>
        <td className={cn(NUMERIC_CELL, "font-medium")}>{group.calories.toLocaleString("en-US")}</td>
        <td className={cn(MACRO_CELL, "font-medium")}>{group.proteinG} g</td>
        <td className={cn(MACRO_CELL, "font-medium")}>{group.carbsG} g</td>
        <td className={cn(MACRO_CELL, "font-medium")}>{group.fatG} g</td>
        <td className={NOTES_COLUMN} />
        <td className="py-1 pl-2 text-right">
          <div className="flex items-center justify-end gap-0.5">
            {copied ? (
              <button
                type="button"
                aria-label={`Paste ${copied.foodName} into ${group.label}`}
                title={`Paste into ${group.label}`}
                disabled={isPasting}
                onClick={() => onPaste(group.day)}
                className={ROW_ICON}
              >
                <ClipboardPaste aria-hidden className="size-4" />
              </button>
            ) : null}
            <DeleteControl
              ids={group.meals.map((meal) => meal.id)}
              name={`all meals from ${group.label}`}
              asUserId={asUserId}
              confirmDetail={count}
            />
          </div>
        </td>
        <td className="py-1 pl-2 text-right sm:pl-3">
          <GoalBadge group={group} />
        </td>
      </tr>
      {expanded
        ? group.meals.map((meal) => (
            <tr key={meal.id} className="border-t border-zinc-100">
              <td className="py-2 pr-2 sm:pl-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  {meal.imageUrl ? (
                    <img
                      src={meal.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-9 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-100">
                      <Utensils aria-hidden className="size-4 text-zinc-400" />
                    </span>
                  )}
                  <div>
                    <p className="font-medium text-zinc-900">{meal.foodName}</p>
                    <p className="text-xs text-zinc-500">{meal.time}</p>
                    {meal.notes ? (
                      <p title={meal.notes} className="line-clamp-2 text-xs break-words text-zinc-500 italic lg:hidden">
                        {meal.notes}
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className={NUMERIC_CELL}>{meal.calories.toLocaleString("en-US")}</td>
              <td className={MACRO_CELL}>{meal.proteinG} g</td>
              <td className={MACRO_CELL}>{meal.carbsG} g</td>
              <td className={MACRO_CELL}>{meal.fatG} g</td>
              <td className={cn(NOTES_COLUMN, "py-2 pl-3 text-xs text-zinc-600")}>
                {meal.notes ? (
                  <p title={meal.notes} className="line-clamp-2 min-w-40 break-words">
                    {meal.notes}
                  </p>
                ) : null}
              </td>
              <td className="py-2 pl-2 text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    type="button"
                    aria-label={`Copy ${meal.foodName}`}
                    title="Copy"
                    onClick={() => onCopy({ id: meal.id, foodName: meal.foodName })}
                    className={cn(ROW_ICON, copied?.id === meal.id && "text-accent")}
                  >
                    <Copy aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${meal.foodName}`}
                    title="Edit"
                    onClick={() => onEdit(meal)}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <Pencil aria-hidden className="size-4" />
                  </button>
                  <DeleteControl ids={[meal.id]} name={meal.foodName} asUserId={asUserId} />
                </div>
              </td>
              <td />
            </tr>
          ))
        : null}
    </tbody>
  );
}

export function FoodLogTree({
  groups,
  windowDays,
  asUserId,
  today,
  aboveList,
  workouts,
  drinks,
}: {
  groups: DayGroup[];
  windowDays: number;
  asUserId?: string;
  today: string;
  /** Shown between the panel's heading and the list. */
  aboveList?: ReactNode;
  /** Content of the Workouts tab. */
  workouts?: ReactNode;
  /** Content of the Drinks tab. */
  drinks?: ReactNode;
}) {
  // Only the newest day is open by default, so the list stays short and scannable
  // and a new day's first meal is visible as soon as it arrives. This tracks the
  // days the user has flipped from that default.
  const [toggled, setToggled] = useState<ReadonlySet<string>>(() => new Set());
  const newestDay = groups[0]?.day;

  const [tab, setTab] = useState<"meals" | "workouts" | "drinks">("meals");
  const { copied, copy, clear } = useCopiedMeal();
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isPasting, startPasting] = useTransition();

  function paste(day: string, { clearAfter = false } = {}) {
    if (!copied) return;

    setPasteError(null);
    startPasting(async () => {
      const result = await pasteFoodLog(copied.id, day, asUserId).catch(() => null);
      if (result?.status !== "saved") {
        setPasteError(result?.message ?? "The meal couldn't be pasted.");
      } else if (clearAfter) {
        clear();
      }
    });
  }
  const [editingMeal, setEditingMeal] = useState<DayGroup["meals"][number] | null>(null);
  const closeEditor = useCallback(() => setEditingMeal(null), []);

  function toggle(day: string) {
    setToggled((current) => {
      const next = new Set(current);
      if (!next.delete(day)) next.add(day);
      return next;
    });
  }

  return (
    <Card>
      <div className="flex flex-col gap-2.5 p-3.5 pb-0">
        <div>
          <div role="group" aria-label="Activity" className="flex gap-4 border-b border-zinc-200">
            {(["meals", "workouts", "drinks"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={tab === option}
                onClick={() => setTab(option)}
                className={cn(
                  "-mb-px border-b-2 pb-1.5 text-sm font-semibold tracking-tight capitalize focus-visible:outline-2 focus-visible:outline-accent",
                  tab === option
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-900",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <CardDescription className="pt-1.5">
            {tab === "meals"
              ? `Your last ${windowDays} days, grouped by day`
              : tab === "workouts"
                ? "Workouts and the calories your watch or app reported"
                : "Glasses each day. Drinks add no calories, so log milk or sugar as a meal too"}
          </CardDescription>
        </div>
        {aboveList}
      </div>
      <CardContent>
        {tab === "meals" && copied ? (
          <div
            role="status"
            className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700"
          >
            <span className="min-w-0 truncate">
              Copied <strong className="font-medium text-zinc-950">{copied.foodName}</strong>
            </span>
            <span className="flex items-center gap-1">
              {pasteError ? <span className="text-status-critical-ink">{pasteError}</span> : null}
              <Button
                variant="secondary"
                disabled={isPasting}
                onClick={() => paste(today, { clearAfter: true })}
                className="h-7 px-2 text-xs"
              >
                {isPasting ? "Pasting" : "Paste to today"}
              </Button>
              <button type="button" aria-label="Clear copied meal" onClick={clear} className={ROW_ICON}>
                <X aria-hidden className="size-4" />
              </button>
            </span>
          </div>
        ) : null}
        {tab === "workouts" ? workouts : tab === "drinks" ? drinks : groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            Nothing logged yet. Add a photo to log your first meal.
          </p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Meals by day"
            className="max-h-[28rem] overflow-y-auto focus-visible:outline-2 focus-visible:outline-accent"
          >
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="text-xs text-zinc-500">
                  <th scope="col" className="border-b border-zinc-200 py-2 pr-2 text-left font-medium">
                    Meal
                  </th>
                  <th scope="col" className="border-b border-zinc-200 px-2 py-2 text-right font-medium">
                    Calories
                  </th>
                  <th scope="col" className={cn(MACRO_HEADER, "border-b border-zinc-200")}>Protein</th>
                  <th scope="col" className={cn(MACRO_HEADER, "border-b border-zinc-200")}>Carbs</th>
                  <th scope="col" className={cn(MACRO_HEADER, "border-b border-zinc-200")}>Fat</th>
                  <th
                    scope="col"
                    className={cn(NOTES_COLUMN, "w-1/3 border-b border-zinc-200 py-2 pl-3 text-left font-medium")}
                  >
                    Notes
                  </th>
                  <th scope="col" className="w-px border-b border-zinc-200 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                  <th scope="col" className="border-b border-zinc-200 py-2 pl-2 text-right font-medium sm:pl-3">
                    Goal
                  </th>
                </tr>
              </thead>
              {groups.map((group) => (
                <DayRows
                  key={group.day}
                  group={group}
                  expanded={(group.day === newestDay) !== toggled.has(group.day)}
                  onToggle={() => toggle(group.day)}
                  onEdit={setEditingMeal}
                  asUserId={asUserId}
                  copied={copied}
                  onCopy={(meal) => {
                    setPasteError(null);
                    copy(meal);
                  }}
                  onPaste={(day) => paste(day)}
                  isPasting={isPasting}
                />
              ))}
            </table>
          </div>
        )}
        {editingMeal ? (
          <MealEditDialog
            key={editingMeal.id}
            meal={editingMeal}
            asUserId={asUserId}
            onClose={closeEditor}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
