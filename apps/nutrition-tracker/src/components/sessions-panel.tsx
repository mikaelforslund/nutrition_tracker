import { Card, cn } from "@trackerx/ui";
import Link from "next/link";
import {
  formatDuration,
  sessionDurationMs,
  sessionStatus,
  type SessionSort,
  type SessionStatus,
} from "@/lib/session-summary";
import type { SessionSummary } from "@/lib/sessions";
import { SessionRemove } from "./session-remove";

const SORTS: { value: SessionSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

const STATUS: Record<SessionStatus, { label: string; dot: string; text: string }> = {
  active: { label: "Active", dot: "bg-status-good", text: "font-medium text-status-good-ink" },
  inactive: { label: "Inactive", dot: "bg-zinc-400", text: "text-zinc-600" },
  ended: { label: "Ended", dot: "border border-zinc-400", text: "text-zinc-500" },
};

function sessionHref(sessionId: string | null, sort: SessionSort) {
  const params = new URLSearchParams();
  if (sessionId) params.set("session", sessionId);
  if (sort !== "newest") params.set("sort", sort);

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function startedAt(session: SessionSummary) {
  return session.createdAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: session.timezone,
  });
}

export function SessionsPanel({
  sessions,
  selectedId,
  protectedUserId,
  sort,
  now,
}: {
  /** Already in display order. */
  sessions: SessionSummary[];
  selectedId: string | null;
  /** The default person, who can't be deleted. */
  protectedUserId: string;
  sort: SessionSort;
  now: number;
}) {
  return (
    <aside aria-label="Sessions" className="min-w-0 xl:sticky xl:top-3">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 pb-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Sessions <span className="font-normal text-zinc-500">{sessions.length}</span>
          </h2>
          <div role="group" aria-label="Sort sessions" className="flex rounded-lg bg-zinc-100 p-0.5">
            {SORTS.map(({ value, label }) => (
              <Link
                key={value}
                href={sessionHref(selectedId, value)}
                scroll={false}
                aria-current={sort === value ? "true" : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-accent",
                  sort === value ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-900",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {sessions.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-zinc-500">No sessions yet.</p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Session list"
            className="max-h-[calc(100dvh-7rem)] overflow-auto focus-visible:outline-2 focus-visible:outline-accent"
          >
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-10 bg-white text-zinc-500">
                <tr>
                  <th scope="col" className="border-b border-zinc-200 py-2 pr-2 pl-4 text-left font-medium">Person</th>
                  <th scope="col" className="border-b border-zinc-200 px-2 py-2 text-left font-medium">Status</th>
                  <th scope="col" className="border-b border-zinc-200 px-2 py-2 text-left font-medium">Started</th>
                  <th scope="col" className="border-b border-zinc-200 px-2 py-2 text-right font-medium">Duration</th>
                  <th scope="col" className="border-b border-zinc-200 py-2 pr-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const status = STATUS[sessionStatus(session, now)];
                  const selected = selectedId === session.id;

                  return (
                    <tr
                      key={session.id}
                      className={cn("relative hover:bg-zinc-50", selected && "bg-zinc-100 hover:bg-zinc-100")}
                    >
                      <td className="border-b border-zinc-100 py-2 pr-2 pl-4">
                        {/* The link's overlay makes the whole row clickable. */}
                        <Link
                          href={sessionHref(session.id, sort)}
                          aria-current={selected ? "page" : undefined}
                          className="block max-w-32 truncate text-sm font-medium text-zinc-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          {session.displayName}
                        </Link>
                        <span className="block max-w-32 truncate text-zinc-500">{session.deviceLabel}</span>
                      </td>
                      <td className="border-b border-zinc-100 px-2 py-2 whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1.5", status.text)}>
                          <span aria-hidden className={cn("size-2 rounded-full", status.dot)} />
                          {status.label}
                        </span>
                      </td>
                      <td className="border-b border-zinc-100 px-2 py-2 whitespace-nowrap text-zinc-600">
                        {startedAt(session)}
                      </td>
                      <td className="border-b border-zinc-100 px-2 py-2 text-right whitespace-nowrap text-zinc-900 tabular-nums">
                        {formatDuration(sessionDurationMs(session))}
                      </td>
                      <td className="relative z-[1] border-b border-zinc-100 py-2 pr-2 text-right">
                        <SessionRemove
                          sessionId={session.id}
                          userId={session.userId}
                          name={session.displayName}
                          deviceLabel={session.deviceLabel}
                          ended={session.endedAt !== null}
                          canDeletePerson={session.userId !== protectedUserId}
                          selected={selected}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </aside>
  );
}
