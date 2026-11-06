import { describe, expect, it } from "vitest";
import {
  UNGROUPED,
  formatDuration,
  groupSessions,
  groupSummary,
  sessionDurationMs,
  sessionStatus,
  sortSessions,
  type SessionTimes,
} from "./session-summary";

const MINUTE = 60_000;
const now = Date.parse("2026-03-10T12:00:00Z");
const ago = (minutes: number) => new Date(now - minutes * MINUTE);

const session = (overrides: Partial<SessionTimes> = {}): SessionTimes => ({
  createdAt: ago(60),
  lastSeenAt: ago(1),
  endedAt: null,
  ...overrides,
});

describe("sessionStatus", () => {
  it("is active when used in the last 5 minutes", () => {
    expect(sessionStatus(session(), now)).toBe("active");
  });

  it("is inactive when signed in but not used lately", () => {
    expect(sessionStatus(session({ lastSeenAt: ago(6) }), now)).toBe("inactive");
  });

  it("is ended once ended, however recent", () => {
    expect(sessionStatus(session({ endedAt: ago(1) }), now)).toBe("ended");
  });
});

describe("sessionDurationMs", () => {
  it("runs to the last use while open", () => {
    expect(sessionDurationMs(session())).toBe(59 * MINUTE);
  });

  it("runs to the end once ended", () => {
    expect(sessionDurationMs(session({ endedAt: ago(30) }))).toBe(30 * MINUTE);
  });

  it("is never negative", () => {
    expect(sessionDurationMs(session({ createdAt: ago(1), lastSeenAt: ago(2) }))).toBe(0);
  });
});

describe("formatDuration", () => {
  it.each([
    [30_000, "Under 1 min"],
    [12 * MINUTE, "12 min"],
    [60 * MINUTE, "1 h"],
    [65 * MINUTE, "1 h 5 min"],
    [24 * 60 * MINUTE, "1 d"],
    [27 * 60 * MINUTE, "1 d 3 h"],
  ])("formats %d", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe("sortSessions", () => {
  const older = session({ createdAt: ago(100) });
  const newer = session({ createdAt: ago(10) });

  it("sorts by start time in both directions", () => {
    expect(sortSessions([older, newer], "newest")).toEqual([newer, older]);
    expect(sortSessions([newer, older], "oldest")).toEqual([older, newer]);
  });
});

describe("groupSessions", () => {
  const family = { id: "family", name: "Family" };
  const work = { id: "work", name: "Work" };
  const a = { name: "a", groupId: "family" };
  const b = { name: "b", groupId: null };
  const c = { name: "c", groupId: "family" };

  it("puts sessions under their group in the order they arrive, ungrouped last", () => {
    expect(groupSessions([a, b, c], [family])).toEqual([
      { group: family, key: "family", sessions: [a, c] },
      { group: null, key: UNGROUPED, sessions: [b] },
    ]);
  });

  it("keeps empty groups so people can be moved into them", () => {
    expect(groupSessions([a], [family, work])).toEqual([
      { group: family, key: "family", sessions: [a] },
      { group: work, key: "work", sessions: [] },
      { group: null, key: UNGROUPED, sessions: [] },
    ]);
  });

  it("never loses a session whose group has just been deleted", () => {
    expect(groupSessions([a], [])).toEqual([{ group: null, key: UNGROUPED, sessions: [a] }]);
  });
});

describe("groupSummary", () => {
  const user = (userId: string, minutesAgo: number) => ({ ...session({ lastSeenAt: ago(minutesAgo) }), userId });

  it("counts users and mentions active ones", () => {
    expect(groupSummary([user("a", 1), user("b", 90)], now)).toBe("2 users, 1 active");
  });

  it("counts someone on two devices once", () => {
    expect(groupSummary([user("a", 1), user("a", 2)], now)).toBe("1 user, 1 active");
  });

  it("leaves out active when there are none", () => {
    expect(groupSummary([user("a", 90)], now)).toBe("1 user");
    expect(groupSummary([], now)).toBe("0 users");
  });
});
