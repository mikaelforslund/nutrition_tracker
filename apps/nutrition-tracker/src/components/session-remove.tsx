"use client";

import { Button, Dialog, Field, Select } from "@trackerx/ui";
import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deletePerson,
  endSessionNow,
  movePerson,
  removeSessionFromList,
  type SessionActionResult,
} from "@/app/session-actions";
import type { SessionGroup } from "@/lib/session-summary";

export function SessionRemove({
  sessionId,
  userId,
  name,
  deviceLabel,
  ended,
  canDeletePerson,
  selected,
  groups,
  groupId,
}: {
  sessionId: string;
  userId: string;
  name: string;
  deviceLabel: string;
  ended: boolean;
  canDeletePerson: boolean;
  selected: boolean;
  groups: SessionGroup[];
  groupId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<SessionActionResult>, leavesView: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => null);
      if (result?.status === "done") {
        setOpen(false);
        if (selected && leavesView) router.push("/");
      } else {
        setError(result?.message ?? "That didn't work. Try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Manage ${name} on ${deviceLabel}`}
        title="Group, end, or remove"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Ellipsis aria-hidden className="size-3.5" />
      </button>
      {open ? (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title={`${name} on ${deviceLabel}`}
          description={ended ? "This session has ended." : undefined}
        >
          <div className="flex flex-col gap-2 text-left">
            {groups.length > 0 ? (
              <div className="mb-2">
                <Field label="Group" hint={`Applies to all of ${name}'s devices.`}>
                  <Select
                    value={groupId ?? ""}
                    disabled={isPending}
                    onChange={(event) => {
                      const next = event.target.value || null;
                      run(() => movePerson(userId, next), false);
                    }}
                  >
                    <option value="">Ungrouped</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : null}
            {ended ? null : (
              <>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => run(() => endSessionNow(sessionId), false)}
                >
                  End session
                </Button>
                <p className="text-xs text-zinc-500">
                  Signs out this device and keeps the session in the list as Ended.
                </p>
              </>
            )}
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => run(() => removeSessionFromList(sessionId), true)}
            >
              Remove from list
            </Button>
            <p className="text-xs text-zinc-500">
              Erases this session&apos;s record. {name}&apos;s meals are kept.
            </p>
            {canDeletePerson ? (
              <>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => run(() => deletePerson(userId), true)}
                  className="border-status-critical-track text-status-critical-ink hover:bg-status-critical-track/40"
                >
                  Delete {name} and all their meals
                </Button>
                <p className="text-xs text-zinc-500">
                  Permanently deletes this person, their meals, photos, and every session. This can&apos;t be undone.
                </p>
              </>
            ) : null}
            {error ? <p role="alert" className="text-xs text-status-critical-ink">{error}</p> : null}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
