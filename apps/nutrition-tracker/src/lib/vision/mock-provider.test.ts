import { describe, expect, it } from "vitest";
import { visionAnalysisSchema } from "./contract";
import { createMockVisionProvider } from "./mock-provider";

const input = { kind: "url", url: "https://images.example.com/plate.jpg" } as const;

describe("mock vision provider", () => {
  it("returns a payload that satisfies the contract", async () => {
    const provider = createMockVisionProvider({ latencyMs: 0 });
    const analysis = await provider.analyze("NUTRITION", input);
    expect(() => visionAnalysisSchema.parse(analysis)).not.toThrow();
  });

  it("gives the same answer for the same image", async () => {
    const provider = createMockVisionProvider({ latencyMs: 0 });
    expect(await provider.analyze("NUTRITION", input)).toEqual(
      await provider.analyze("NUTRITION", input),
    );
  });

  it("waits for the configured latency", async () => {
    const provider = createMockVisionProvider({ latencyMs: 50 });
    const start = performance.now();
    await provider.analyze("NUTRITION", input);
    expect(performance.now() - start).toBeGreaterThanOrEqual(45);
  });

  it("stops early when aborted", async () => {
    const provider = createMockVisionProvider({ latencyMs: 60_000 });
    const controller = new AbortController();
    const pending = provider.analyze("NUTRITION", input, controller.signal);
    controller.abort(new Error("cancelled"));
    await expect(pending).rejects.toThrow("cancelled");
  });
});
