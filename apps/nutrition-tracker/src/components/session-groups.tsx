"use client";

import { Button, Dialog, Field, Input, cn } from "@trackerx/ui";
import { ChevronRight, FolderPlus, Pencil } from "lucide-react";
import {
  useState,
  useSyncExternalStore,
  useTransition,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { deleteGroup, movePerson, saveGroup, type SessionActionResult } from "@/app/session-actions";
import type { SessionGroup } from "@/lib/session-summary";

const CLOSED_KEY = "trackerx.closed-session-groups";
const CLOSED_EVENT = "trackerx:session-groups";
/** Only drags of a session row are accepted, never dragged text or files. */
const DRAG_TYPE = "application/x-trackerx-person";
const ICON_BUTTON =
  "rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-accent";

function subscribeToClosed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CLOSED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CLOSED_EVENT, onChange);
  };
}

const parseClosed = (saved: string): string[] => {
  try {
    const value: unknown = JSON.parse(saved);
    return Array.isArray(value) ? value.filter((key) => typeof key === "string") : [];
  } catch {
    return [];
  }
};

/** Remembered in the browser, so groups stay how they were left. */
function useGroupOpen(groupKey: string) {
  const saved = useSyncExternalStore(
    subscribeToClosed,
    () => localStorage.getItem(CLOSED_KEY) ?? "[]",
    () => "[]",
  );
  const closed = parseClosed(saved);
  const open = !closed.includes(groupKey);

  function toggle() {
    const next = open ? [...closed, groupKey] : closed.filter((key) => key !== groupKey);
    localStorage.setItem(CLOSED_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CLOSED_EVENT));
  }

  return [open, toggle] as const;
}

function GroupDialog({ group, onClose }: { group: SessionGroup | null; onClose: () => void }) {
  const [name, setName] = useState(group?.name ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<SessionActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => null);
      if (result?.status === "done") onClose();
      else setError(result?.message ?? "That didn't work. Try again.");
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run(() => saveGroup(group?.id ?? null, name));
  }

  return (
    <Dialog open onClose={onClose} title={group ? "Edit group" : "New group"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        <Field label="Name">
          <Input
            required
            autoFocus
            maxLength={40}
            value={name}
            placeholder="Family"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {error ? <p role="alert" className="text-xs text-status-critical-ink">{error}</p> : null}
        <div className="flex items-center justify-between gap-2">
          {group ? (
            confirmingDelete ? (
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => run(() => deleteGroup(group.id))}
                className="border-status-critical-track text-status-critical-ink hover:bg-status-critical-track/40"
              >
                Confirm delete
              </Button>
            ) : (
              <Button variant="ghost" disabled={isPending} onClick={() => setConfirmingDelete(true)}>
                Delete group
              </Button>
            )
          ) : (
            <span />
          )}
          <span className="flex gap-2">
            <Button variant="ghost" disabled={isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving" : "Save"}
            </Button>
          </span>
        </div>
        {confirmingDelete ? (
          <p className="text-xs text-zinc-500">
            Everyone in {group?.name} moves to Ungrouped. No people, sessions, or meals are deleted.
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

export function NewGroupButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="New group"
        title="New group"
        onClick={() => setOpen(true)}
        className={ICON_BUTTON}
      >
        <FolderPlus aria-hidden className="size-4" />
      </button>
      {open ? <GroupDialog group={null} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** A session row that can be dragged to another group. */
export function DraggableSessionRow({
  userId,
  groupKey,
  enabled,
  className,
  children,
}: {
  userId: string;
  groupKey: string;
  enabled: boolean;
  className?: string;
  children: ReactNode;
}) {
  function handleDragStart(event: DragEvent<HTMLTableRowElement>) {
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ userId, groupKey }));
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <tr
      draggable={enabled}
      onDragStart={enabled ? handleDragStart : undefined}
      className={cn(enabled && "cursor-grab active:cursor-grabbing", className)}
    >
      {children}
    </tr>
  );
}

const parseDrag = (data: string): { userId: string; groupKey: string } | null => {
  try {
    return JSON.parse(data) as { userId: string; groupKey: string };
  } catch {
    return null;
  }
};

/** A group's parent row, with its sessions beneath it while open. */
export function SessionGroupRows({
  groupKey,
  group,
  summary,
  children,
}: {
  groupKey: string;
  /** Null for the people in no group. */
  group: SessionGroup | null;
  summary: string;
  children: ReactNode;
}) {
  const [open, toggle] = useGroupOpen(groupKey);
  const [editing, setEditing] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [moveFailed, setMoveFailed] = useState(false);
  const [, startMoving] = useTransition();
  const name = group?.name ?? "Ungrouped";

  function handleDragOver(event: DragEvent<HTMLTableSectionElement>) {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropping(true);
  }

  function handleDragLeave(event: DragEvent<HTMLTableSectionElement>) {
    // Moving between this group's own rows also fires this.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
  }

  function handleDrop(event: DragEvent<HTMLTableSectionElement>) {
    event.preventDefault();
    setDropping(false);

    const dragged = parseDrag(event.dataTransfer.getData(DRAG_TYPE));
    if (!dragged || dragged.groupKey === groupKey) return;

    setMoveFailed(false);
    startMoving(async () => {
      const result = await movePerson(dragged.userId, group?.id ?? null).catch(() => null);
      if (result?.status !== "done") setMoveFailed(true);
    });
  }

  return (
    <tbody onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <tr className={cn(dropping && "bg-accent-track")}>
        <td colSpan={4} className="border-b border-zinc-200 p-0">
          <button
            type="button"
            aria-expanded={open}
            onClick={toggle}
            className="flex w-full items-center gap-1.5 py-2 pr-2 pl-4 text-left hover:bg-zinc-50/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronRight
              aria-hidden
              className={cn("size-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-90")}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{name}</span>
            {moveFailed ? (
              <span role="alert" className="shrink-0 text-status-critical-ink">
                Couldn&apos;t move. Try again
              </span>
            ) : (
              <span className="shrink-0 text-zinc-500">{summary}</span>
            )}
          </button>
        </td>
        <td className="border-b border-zinc-200 py-1 pr-2 text-right">
          {group ? (
            <button
              type="button"
              aria-label={`Edit ${name}`}
              title="Rename or delete"
              onClick={() => setEditing(true)}
              className={ICON_BUTTON}
            >
              <Pencil aria-hidden className="size-3.5" />
            </button>
          ) : null}
          {editing ? <GroupDialog group={group} onClose={() => setEditing(false)} /> : null}
        </td>
      </tr>
      {open ? children : null}
    </tbody>
  );
}
