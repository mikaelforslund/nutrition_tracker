import { describe, expect, it } from "vitest";
import {
  formatDuration,
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
