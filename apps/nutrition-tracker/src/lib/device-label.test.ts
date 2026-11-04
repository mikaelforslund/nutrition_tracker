import { describe, expect, it } from "vitest";
import { describeDevice } from "./device-label";

describe("describeDevice", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) Version/26.0 Mobile/15E148 Safari/604.1", "iPhone, Safari"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) CriOS/140.0 Mobile/15E148 Safari/604.1", "iPhone, Chrome"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) FxiOS/140.0 Mobile/15E148 Safari/604.1", "iPhone, Firefox"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/140.0 Safari/537.36", "Mac, Chrome"],
    ["Mozilla/5.0 (Linux; Android 16) Chrome/140.0 Mobile Safari/537.36", "Android, Chrome"],
    ["curl/8.0", "Unknown device"],
  ])("labels %s", (userAgent, label) => {
    expect(describeDevice(userAgent)).toBe(label);
  });
});
